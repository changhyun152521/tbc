import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { jwtConfig } from '../config';
import { JwtPayload } from '../types/api';

export interface LoginResult {
  token: string;
  user: { id: string; role: string; name: string };
}

/**
 * 기획 문서 기준 4역할(admin, teacher, student, parent) 공통 로그인.
 * 학생/학부모는 관리자 등록 시 전화번호로 ID·비밀번호 자동 설정된 계정으로도 로그인 가능.
 */
/** 로그인 ID는 가공 없이 DB에 저장된 값과 일치해야 함 (전화번호 그대로 사용 시 동일 문자열로 로그인). */
export async function login(loginId: string, password: string): Promise<LoginResult | null> {
  const user = await User.findOne({ loginId }).exec();
  if (!user) return null;

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;

  const payload: JwtPayload = { sub: user._id.toString(), role: user.role };
  const token = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
  return {
    token,
    user: { id: user._id.toString(), role: user.role, name: user.name },
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

  const { User } = await import('../models/User.model');
  const { Student } = await import('../models/Student.model');

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
