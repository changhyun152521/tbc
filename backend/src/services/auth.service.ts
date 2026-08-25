import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.model';
import { Student } from '../models/Student.model';
import { Class } from '../models/Class.model';
import { jwtConfig } from '../config';
import { JwtPayload } from '../types/api';
import { touchLastAccess } from './lastAccess.service';

export interface LoginResult {
  token: string;
  user: { id: string; role: string; name: string; mustChangePassword?: boolean };
}

export type LoginOutcome =
  | { ok: true; data: LoginResult }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'no_class'; message: string };

const NO_CLASS_MESSAGE = '소속된 반이 없습니다. 관리자에게 문의해 주세요.';

/**
 * 학생·학부모·관리접속: Class.studentIds에 한 반이라도 있어야 로그인 가능.
 * admin·teacher는 검사하지 않음.
 */
async function hasClassMembership(userId: string, role: string): Promise<boolean> {
  if (role !== 'student' && role !== 'parent') return true;
  if (!mongoose.Types.ObjectId.isValid(userId)) return false;
  const uid = new mongoose.Types.ObjectId(userId);

  let studentId: mongoose.Types.ObjectId | null = null;
  if (role === 'parent') {
    const student = await Student.findOne({ parentUserId: uid }).select('_id').lean().exec();
    studentId = student?._id ?? null;
  } else {
    const byMain = await Student.findOne({ userId: uid }).select('_id').lean().exec();
    if (byMain) {
      studentId = byMain._id;
    } else {
      const byAdmin = await Student.findOne({ adminAccessUserId: uid }).select('_id').lean().exec();
      studentId = byAdmin?._id ?? null;
    }
  }
  if (!studentId) return false;

  const count = await Class.countDocuments({ studentIds: studentId }).exec();
  return count > 0;
}

/**
 * 기획 문서 기준 4역할(admin, teacher, student, parent) 공통 로그인.
 * 학생/학부모는 관리자 등록 시 전화번호로 ID·비밀번호 자동 설정된 계정으로도 로그인 가능.
 */
/** 로그인 ID는 가공 없이 DB에 저장된 값과 일치해야 함 (전화번호 그대로 사용 시 동일 문자열로 로그인). */
export async function login(loginId: string, password: string): Promise<LoginOutcome> {
  const user = await User.findOne({ loginId }).exec();
  if (!user) return { ok: false, reason: 'invalid' };

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return { ok: false, reason: 'invalid' };

  const { isAdminAccessUser } = await import('./lastAccess.service');
  if (await isAdminAccessUser(user._id.toString())) {
    return {
      ok: false,
      reason: 'no_class',
      message: '관리 접속 계정은 더 이상 사용할 수 없습니다. 학생 관리의 미리보기를 이용해 주세요.',
    };
  }

  const allowed = await hasClassMembership(user._id.toString(), user.role);
  if (!allowed) {
    return { ok: false, reason: 'no_class', message: NO_CLASS_MESSAGE };
  }

  await touchLastAccess(user._id.toString());

  const payload: JwtPayload = { sub: user._id.toString(), role: user.role };
  const token = jwt.sign(
    payload,
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions
  );
  return {
    ok: true,
    data: {
      token,
      user: {
        id: user._id.toString(),
        role: user.role,
        name: user.name,
        mustChangePassword: user.mustChangePassword === true,
      },
    },
  };
}

/** 전화번호 비교: 공백/하이픈 제거 후 일치 여부 확인 */
function normalizePhone(s: string): string {
  return String(s).replace(/[\s\-]/g, '');
}

/**
 * 아이디 찾기: 학생 또는 학부모용
 * - 학생: 이름 + 학생 전화번호
 * - 학부모: 학생명 + 학부모 전화번호
 */
export async function findLoginId(
  type: 'student' | 'parent',
  name: string,
  phone: string
): Promise<string | null> {
  const trimmedName = name.trim();
  const normalizedPhone = normalizePhone(phone);

  if (!trimmedName || !normalizedPhone) return null;

  const students = await Student.find({ name: trimmedName }).lean().exec();
  const student = students.find((s) => {
    const phoneToCheck = type === 'student' ? s.studentPhone : s.parentPhone;
    return normalizePhone(phoneToCheck) === normalizedPhone;
  });
  if (!student) return null;

  const userId = type === 'student' ? student.userId : student.parentUserId;
  const user = await User.findById(userId).select('loginId').lean().exec();
  return user?.loginId ?? null;
}

const PREVIEW_TOKEN_EXPIRES = '2h';

/**
 * 관리자·강사 → 학생/학부모 화면 미리보기용 단기 JWT.
 * preview=true 로 쓰기 API 차단.
 */
export async function createPreviewSession(
  studentId: string,
  view: 'student' | 'parent',
  actorUserId: string,
  actorRole: string
): Promise<
  | { token: string; user: { id: string; role: string; name: string }; studentName: string }
  | { error: string; status: number }
> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return { error: '올바른 학생 ID가 아닙니다.', status: 400 };
  }
  if (actorRole === 'teacher') {
    const { getAssignedStudentIds } = await import('./teacher/teacherClass.service');
    const assigned = await getAssignedStudentIds(actorUserId);
    if (!assigned.includes(studentId)) {
      return { error: '담당 반 학생만 미리보기할 수 있습니다.', status: 403 };
    }
  } else if (actorRole !== 'admin') {
    return { error: '미리보기 권한이 없습니다.', status: 403 };
  }

  const student = await Student.findById(studentId)
    .select('name userId parentUserId')
    .exec();
  if (!student) return { error: '학생을 찾을 수 없습니다.', status: 404 };

  let targetUserId: mongoose.Types.ObjectId | undefined;
  let role: 'student' | 'parent';
  let displayName: string;

  if (view === 'student') {
    targetUserId = student.userId;
    role = 'student';
    displayName = student.name.trim();
  } else {
    targetUserId = student.parentUserId;
    role = 'parent';
    displayName = `${student.name.trim()} 학부모`;
  }
  if (!targetUserId) {
    return { error: '미리보기 계정을 찾을 수 없습니다.', status: 404 };
  }

  const user = await User.findById(targetUserId).exec();
  if (!user) return { error: '미리보기 계정을 찾을 수 없습니다.', status: 404 };

  const payload: JwtPayload = { sub: user._id.toString(), role, preview: true };
  const token = jwt.sign(payload, jwtConfig.secret, { expiresIn: PREVIEW_TOKEN_EXPIRES } as jwt.SignOptions);

  return {
    token,
    user: { id: user._id.toString(), role, name: displayName },
    studentName: student.name.trim(),
  };
}
