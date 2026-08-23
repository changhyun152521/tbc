import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../../models/User.model';
import { Student } from '../../models/Student.model';
import { Class } from '../../models/Class.model';
import { IStudent } from '../../models/Student.model';
import { LessonDay } from '../../models/LessonDay.model';
import { deleteNotificationsForStudent } from '../notification.service';

const SALT_ROUNDS = 10;

export interface CreateStudentInput {
  name: string;
  school: string;
  grade: string;
  studentPhone: string;
  parentPhone: string;
  studentLoginId?: string;
  studentPassword?: string;
  parentLoginId?: string;
  parentPassword?: string;
  classId?: string;
}

export interface UpdateStudentInput {
  name?: string;
  school?: string;
  grade?: string;
  studentPhone?: string;
  parentPhone?: string;
  studentLoginId?: string;
  studentPassword?: string;
  parentLoginId?: string;
  parentPassword?: string;
  classId?: string | null;
}

export interface ListStudentsQuery {
  name?: string;
  grade?: string;
  classId?: string;
  search?: string; // 이름, 학교, 학생 전화번호, 학부모 전화번호 통합 검색
  page?: number;
  limit?: number;
  /**
   * Class.studentIds 기준으로 목록 제한.
   * 빈 배열이면 결과 없음. undefined면 학생 ID로 제한하지 않음.
   */
  studentIds?: string[];
  /** 관리자만 true — 학생/학부모 loginId 포함 */
  includeLoginIds?: boolean;
  /** 관리자·강사 true — 학생 본인 계정 최근 접속 시각 포함 */
  includeLastAccess?: boolean;
  /** 관리자·강사 true — 학부모 계정 최근 접속 시각 포함 */
  includeParentLastAccess?: boolean;
  /**
   * 강사일 때: 학생 접속은 이 학생 ID들에만 채움.
   * undefined/null이면 includeLastAccess 대상 전원(관리자).
   */
  lastAccessStudentIds?: string[] | null;
  /**
   * 강사일 때: 학부모 접속은 이 학생 ID들에만 채움.
   * undefined/null이면 includeParentLastAccess 대상 전원(관리자).
   */
  parentLastAccessStudentIds?: string[] | null;
}

export interface ListStudentsResult {
  list: (IStudent & { classCount: number; lastAccessAt?: Date | null; parentLastAccessAt?: Date | null })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

const ADMIN_ACCESS_PASSWORD = 'admin';

/**
 * 관리자 접속용 loginId 생성. 이름admin, 중복 시 이름admin1, 이름admin2 ...
 */
async function findAvailableAdminAccessLoginId(baseName: string): Promise<string> {
  const base = `${baseName.trim()}admin`;
  let candidate = base;
  let n = 0;
  while (await User.exists({ loginId: candidate }).exec()) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}

/**
 * 학생에게 관리자 접속용 User가 없으면 생성 후 저장. (기존 학생용 지연 생성)
 */
export async function ensureAdminAccessUser(studentId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return;
  const student = await Student.findById(studentId).exec();
  if (!student || student.adminAccessUserId) return;
  const adminAccessLoginId = await findAvailableAdminAccessLoginId(student.name);
  const adminAccessUser = await User.create({
    role: 'student',
    loginId: adminAccessLoginId,
    passwordHash: await hashPassword(ADMIN_ACCESS_PASSWORD),
    name: student.name,
    phone: '',
    mustChangePassword: false,
  });
  student.adminAccessUserId = adminAccessUser._id;
  await student.save();
}

/**
 * 전화번호: 가공 없이 사용자가 입력한 문자열 그대로 사용 (기획 문서 정책).
 * 자동 생성 ID/비밀번호: 미입력 시 해당 전화번호 문자열을 그대로 loginId, password로 사용.
 */
export async function createStudent(input: CreateStudentInput): Promise<IStudent> {
  const studentLoginId = input.studentLoginId?.trim() || input.studentPhone;
  const studentPassword = input.studentPassword ?? input.studentPhone;
  const parentLoginId = input.parentLoginId?.trim() || input.parentPhone;
  const parentPassword = input.parentPassword ?? input.parentPhone;

  const adminAccessLoginId = await findAvailableAdminAccessLoginId(input.name.trim());

  const [studentUser, parentUser, adminAccessUser] = await Promise.all([
    User.create({
      role: 'student',
      loginId: studentLoginId,
      passwordHash: await hashPassword(studentPassword),
      name: input.name.trim(),
      phone: input.studentPhone,
      mustChangePassword: true,
    }),
    User.create({
      role: 'parent',
      loginId: parentLoginId,
      passwordHash: await hashPassword(parentPassword),
      name: `${input.name.trim()} 학부모`,
      phone: input.parentPhone,
      mustChangePassword: true,
    }),
    User.create({
      role: 'student',
      loginId: adminAccessLoginId,
      passwordHash: await hashPassword(ADMIN_ACCESS_PASSWORD),
      name: input.name.trim(),
      phone: '',
      mustChangePassword: false,
    }),
  ]);

  const student = await Student.create({
    name: input.name.trim(),
    school: input.school.trim(),
    grade: input.grade.trim(),
    studentPhone: input.studentPhone,
    parentPhone: input.parentPhone,
    userId: studentUser._id,
    parentUserId: parentUser._id,
    adminAccessUserId: adminAccessUser._id,
    classId: input.classId ? new mongoose.Types.ObjectId(input.classId) : undefined,
  });

  return student;
}

export async function listStudents(query: ListStudentsQuery): Promise<ListStudentsResult> {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  if (query.studentIds != null && query.studentIds.length === 0) {
    return { list: [], total: 0, page, limit, totalPages: 1 };
  }

  const filter: Record<string, unknown> = {};
  if (query.name?.trim()) filter.name = { $regex: query.name.trim(), $options: 'i' };
  if (query.grade?.trim()) filter.grade = query.grade.trim();
  if (query.studentIds != null) {
    filter._id = {
      $in: query.studentIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
    };
  } else if (query.classId?.trim() && mongoose.Types.ObjectId.isValid(query.classId.trim())) {
    // 하위 호환: Student.classId (레거시). 신규 필터는 studentIds(Class.studentIds) 권장.
    filter.classId = new mongoose.Types.ObjectId(query.classId.trim());
  }
  if (query.search?.trim()) {
    const term = query.search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { school: { $regex: term, $options: 'i' } },
      { studentPhone: { $regex: term, $options: 'i' } },
      { parentPhone: { $regex: term, $options: 'i' } },
    ];
  }

  const populateFields = query.includeLoginIds
    ? [
        { path: 'userId', select: 'loginId' },
        { path: 'parentUserId', select: 'loginId' },
        { path: 'adminAccessUserId', select: 'loginId' },
      ]
    : [{ path: 'adminAccessUserId', select: 'loginId' }];

  const [list, total] = await Promise.all([
    Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(populateFields).lean().exec(),
    Student.countDocuments(filter).exec(),
  ]);

  type LeanStudentWithPopulatedAdmin = Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId | { loginId?: string };
    parentUserId?: mongoose.Types.ObjectId | { loginId?: string };
    adminAccessUserId?: { loginId: string } | null;
  };
  const withClassCountAndAdminId = await Promise.all(
    list.map(async (s) => {
      const doc = s as unknown as LeanStudentWithPopulatedAdmin;
      let adminAccessLoginId: string | null = null;
      if (doc.adminAccessUserId && typeof doc.adminAccessUserId === 'object' && 'loginId' in doc.adminAccessUserId) {
        adminAccessLoginId = (doc.adminAccessUserId as { loginId: string }).loginId;
      }
      if (!adminAccessLoginId) {
        await ensureAdminAccessUser(String(doc._id));
        const updated = await Student.findById(doc._id).populate('adminAccessUserId', 'loginId').lean().exec();
        const updatedTyped = updated as unknown as { adminAccessUserId?: { loginId: string } } | null;
        if (updatedTyped?.adminAccessUserId?.loginId) {
          adminAccessLoginId = updatedTyped.adminAccessUserId.loginId;
        }
      }
      const classCount = await Class.countDocuments({ studentIds: doc._id }).exec();
      const studentLoginId =
        query.includeLoginIds &&
        doc.userId &&
        typeof doc.userId === 'object' &&
        'loginId' in doc.userId
          ? (doc.userId as { loginId?: string }).loginId ?? null
          : undefined;
      const parentLoginId =
        query.includeLoginIds &&
        doc.parentUserId &&
        typeof doc.parentUserId === 'object' &&
        'loginId' in doc.parentUserId
          ? (doc.parentUserId as { loginId?: string }).loginId ?? null
          : undefined;
      return {
        ...doc,
        classCount,
        adminAccessLoginId,
        ...(query.includeLoginIds ? { studentLoginId, parentLoginId } : {}),
      };
    })
  );

  let enrichedList = withClassCountAndAdminId;
  const toUserObjectId = (ref: unknown): mongoose.Types.ObjectId | null => {
    if (!ref) return null;
    if (ref instanceof mongoose.Types.ObjectId) return ref;
    if (typeof ref === 'object' && ref !== null && '_id' in ref) {
      return (ref as { _id: mongoose.Types.ObjectId })._id;
    }
    if (typeof ref === 'string' && mongoose.Types.ObjectId.isValid(ref)) {
      return new mongoose.Types.ObjectId(ref);
    }
    return null;
  };
  if (query.includeLastAccess || query.includeParentLastAccess) {
    const studentAccessAllowed =
      query.lastAccessStudentIds == null
        ? null
        : new Set(query.lastAccessStudentIds.map(String));
    const parentAccessAllowed =
      query.parentLastAccessStudentIds == null
        ? null
        : new Set(query.parentLastAccessStudentIds.map(String));

    const userIds = enrichedList.flatMap((row) => {
      const ids: mongoose.Types.ObjectId[] = [];
      const canSeeStudentAccess =
        query.includeLastAccess &&
        (studentAccessAllowed == null || studentAccessAllowed.has(String(row._id)));
      const studentUid = toUserObjectId(row.userId);
      if (canSeeStudentAccess && studentUid) ids.push(studentUid);
      const canSeeParentAccess =
        query.includeParentLastAccess &&
        (parentAccessAllowed == null || parentAccessAllowed.has(String(row._id)));
      const parentUid = toUserObjectId(row.parentUserId);
      if (canSeeParentAccess && parentUid) ids.push(parentUid);
      return ids;
    });
    const users =
      userIds.length > 0
        ? await User.find({ _id: { $in: userIds } }).select('_id lastAccessAt').lean().exec()
        : [];
    const accessByUserId = new Map(users.map((u) => [u._id.toString(), u.lastAccessAt ?? null]));
    enrichedList = enrichedList.map((row) => {
      const canSeeStudentAccess =
        query.includeLastAccess &&
        (studentAccessAllowed == null || studentAccessAllowed.has(String(row._id)));
      const canSeeParentAccess =
        query.includeParentLastAccess &&
        (parentAccessAllowed == null || parentAccessAllowed.has(String(row._id)));
      const studentUid = toUserObjectId(row.userId);
      const parentUid = toUserObjectId(row.parentUserId);
      return {
        ...row,
        ...(query.includeLastAccess
          ? canSeeStudentAccess
            ? {
                lastAccessAt: studentUid ? accessByUserId.get(studentUid.toString()) ?? null : null,
                lastAccessHidden: false,
              }
            : {
                lastAccessAt: null,
                lastAccessHidden: true,
              }
          : {}),
        ...(query.includeParentLastAccess
          ? canSeeParentAccess
            ? {
                parentLastAccessAt: parentUid
                  ? accessByUserId.get(parentUid.toString()) ?? null
                  : null,
                parentLastAccessHidden: false,
              }
            : {
                parentLastAccessAt: null,
                parentLastAccessHidden: true,
              }
          : {}),
      };
    });
  }

  return {
    list: enrichedList as unknown as (IStudent & {
      classCount: number;
      adminAccessLoginId: string | null;
      studentLoginId?: string | null;
      parentLoginId?: string | null;
      lastAccessAt?: Date | null;
      lastAccessHidden?: boolean;
      parentLastAccessAt?: Date | null;
      parentLastAccessHidden?: boolean;
    })[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getStudentById(id: string): Promise<IStudent | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  let student = await Student.findById(id)
    .populate('userId', 'loginId name phone')
    .populate('parentUserId', 'loginId name phone')
    .populate('adminAccessUserId', 'loginId')
    .populate('classId', 'name description')
    .exec();
  if (student && !student.adminAccessUserId) {
    await ensureAdminAccessUser(id);
    student = await Student.findById(id)
      .populate('userId', 'loginId name phone')
      .populate('parentUserId', 'loginId name phone')
      .populate('adminAccessUserId', 'loginId')
      .populate('classId', 'name description')
      .exec() ?? null;
  }
  return student ?? null;
}

export async function updateStudent(id: string, input: UpdateStudentInput): Promise<IStudent | null> {
  const student = await Student.findById(id).exec();
  if (!student) return null;

  const studentUser = await User.findById(student.userId).exec();
  const parentUser = await User.findById(student.parentUserId).exec();
  if (!studentUser || !parentUser) return null;

  if (input.name !== undefined) {
    student.name = input.name.trim();
    studentUser.name = input.name.trim();
  }
  if (input.school !== undefined) student.school = input.school.trim();
  if (input.grade !== undefined) student.grade = input.grade.trim();
  if (input.studentPhone !== undefined) {
    student.studentPhone = input.studentPhone;
    studentUser.phone = input.studentPhone;
  }
  if (input.parentPhone !== undefined) {
    student.parentPhone = input.parentPhone;
    parentUser.phone = input.parentPhone;
  }
  if (input.classId !== undefined) {
    student.classId = input.classId ? new mongoose.Types.ObjectId(input.classId) : undefined;
  }
  if (input.studentLoginId !== undefined) studentUser.loginId = input.studentLoginId.trim();
  if (input.studentPassword !== undefined && input.studentPassword) {
    studentUser.passwordHash = await hashPassword(input.studentPassword);
  }
  if (input.parentLoginId !== undefined) parentUser.loginId = input.parentLoginId.trim();
  if (input.parentPassword !== undefined && input.parentPassword) {
    parentUser.passwordHash = await hashPassword(input.parentPassword);
  }

  await Promise.all([student.save(), studentUser.save(), parentUser.save()]);
  return getStudentById(id);
}

/**
 * 학생/학부모 계정 초기화: loginId·password를 전화번호로, mustChangePassword=true
 */
export async function resetCredentials(
  studentId: string,
  target: 'student' | 'parent' | 'both'
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return { ok: false, message: '올바른 학생 ID가 아닙니다.', status: 400 };
  }
  const student = await Student.findById(studentId).exec();
  if (!student) return { ok: false, message: '학생을 찾을 수 없습니다.', status: 404 };

  const resetOne = async (
    userId: mongoose.Types.ObjectId | undefined,
    phone: string,
    label: string
  ): Promise<{ ok: true } | { ok: false; message: string; status: number }> => {
    if (!userId) return { ok: false, message: `${label} 계정을 찾을 수 없습니다.`, status: 404 };
    const phoneTrim = String(phone ?? '').trim();
    if (!phoneTrim) {
      return { ok: false, message: `${label} 전화번호가 없어 초기화할 수 없습니다.`, status: 400 };
    }
    const existing = await User.findOne({ loginId: phoneTrim }).exec();
    if (existing && existing._id.toString() !== userId.toString()) {
      return {
        ok: false,
        message: `이미 사용 중인 로그인 ID입니다: "${phoneTrim}". 전화번호를 먼저 확인해 주세요.`,
        status: 400,
      };
    }
    const user = await User.findById(userId).exec();
    if (!user) return { ok: false, message: `${label} 계정을 찾을 수 없습니다.`, status: 404 };
    user.loginId = phoneTrim;
    user.passwordHash = await hashPassword(phoneTrim);
    user.mustChangePassword = true;
    await user.save();
    return { ok: true };
  };

  if (target === 'student' || target === 'both') {
    const r = await resetOne(student.userId, student.studentPhone, '학생');
    if (!r.ok) return r;
  }
  if (target === 'parent' || target === 'both') {
    const r = await resetOne(student.parentUserId, student.parentPhone, '학부모');
    if (!r.ok) return r;
  }
  return { ok: true };
}

export async function deleteStudent(id: string): Promise<boolean> {
  const student = await Student.findById(id).exec();
  if (!student) return false;

  const sid = student._id;
  const recipientUserIds = [
    student.userId?.toString() ?? '',
    student.parentUserId?.toString() ?? '',
    student.adminAccessUserId?.toString() ?? '',
  ].filter(Boolean);

  await Class.updateMany({ studentIds: sid }, { $pull: { studentIds: sid } }).exec();

  // 수업 기록·답글 목록에서 제거
  const lessons = await LessonDay.find({ 'periods.records.studentId': sid }).exec();
  for (const lesson of lessons) {
    let changed = false;
    for (const period of lesson.periods ?? []) {
      const before = (period.records ?? []).length;
      period.records = (period.records ?? []).filter(
        (r) => r.studentId?.toString() !== sid.toString()
      ) as typeof period.records;
      if ((period.records ?? []).length !== before) changed = true;
    }
    if (changed) {
      lesson.markModified('periods');
      await lesson.save();
    }
  }

  await deleteNotificationsForStudent({
    studentId: id,
    recipientUserIds,
  });

  const toDelete: mongoose.Types.ObjectId[] = [student.userId, student.parentUserId];
  if (student.adminAccessUserId) toDelete.push(student.adminAccessUserId);
  await Promise.all([
    ...toDelete.map((uid) => User.findByIdAndDelete(uid)),
    Student.findByIdAndDelete(id),
  ]);
  return true;
}
