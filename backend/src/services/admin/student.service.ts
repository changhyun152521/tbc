import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../../models/User.model';
import { Student } from '../../models/Student.model';
import { Class } from '../../models/Class.model';
import { IStudent } from '../../models/Student.model';

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
  /** 관리자만 true — 학생 본인 계정 최근 접속 시각 포함 */
  includeLastAccess?: boolean;
  /** 관리자·강사 true — 학부모 계정 최근 접속 시각 포함 */
  includeParentLastAccess?: boolean;
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
    }),
    User.create({
      role: 'parent',
      loginId: parentLoginId,
      passwordHash: await hashPassword(parentPassword),
      name: `${input.name.trim()} 학부모`,
      phone: input.parentPhone,
    }),
    User.create({
      role: 'student',
      loginId: adminAccessLoginId,
      passwordHash: await hashPassword(ADMIN_ACCESS_PASSWORD),
      name: input.name.trim(),
      phone: '',
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
  const filter: Record<string, unknown> = {};
  if (query.name?.trim()) filter.name = { $regex: query.name.trim(), $options: 'i' };
  if (query.grade?.trim()) filter.grade = query.grade.trim();
  if (query.classId?.trim() && mongoose.Types.ObjectId.isValid(query.classId.trim())) {
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

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [list, total] = await Promise.all([
    Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('adminAccessUserId', 'loginId').lean().exec(),
    Student.countDocuments(filter).exec(),
  ]);

  type LeanStudentWithPopulatedAdmin = Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    parentUserId?: mongoose.Types.ObjectId;
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
      return { ...doc, classCount, adminAccessLoginId };
    })
  );

  let enrichedList = withClassCountAndAdminId;
  if (query.includeLastAccess || query.includeParentLastAccess) {
    const parentAccessAllowed =
      query.parentLastAccessStudentIds == null
        ? null
        : new Set(query.parentLastAccessStudentIds.map(String));

    const userIds = enrichedList.flatMap((row) => {
      const ids: mongoose.Types.ObjectId[] = [];
      if (query.includeLastAccess && row.userId) ids.push(row.userId);
      const canSeeParentAccess =
        query.includeParentLastAccess &&
        row.parentUserId &&
        (parentAccessAllowed == null || parentAccessAllowed.has(String(row._id)));
      if (canSeeParentAccess && row.parentUserId) ids.push(row.parentUserId);
      return ids;
    });
    const users =
      userIds.length > 0
        ? await User.find({ _id: { $in: userIds } }).select('_id lastAccessAt').lean().exec()
        : [];
    const accessByUserId = new Map(users.map((u) => [u._id.toString(), u.lastAccessAt ?? null]));
    enrichedList = enrichedList.map((row) => {
      const canSeeParentAccess =
        query.includeParentLastAccess &&
        (parentAccessAllowed == null || parentAccessAllowed.has(String(row._id)));
      return {
        ...row,
        ...(query.includeLastAccess
          ? { lastAccessAt: row.userId ? accessByUserId.get(String(row.userId)) ?? null : null }
          : {}),
        ...(query.includeParentLastAccess
          ? canSeeParentAccess
            ? {
                parentLastAccessAt: row.parentUserId
                  ? accessByUserId.get(String(row.parentUserId)) ?? null
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
      lastAccessAt?: Date | null;
      parentLastAccessAt?: Date | null;
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

export async function deleteStudent(id: string): Promise<boolean> {
  const student = await Student.findById(id).exec();
  if (!student) return false;

  const sid = student._id;
  await Class.updateMany(
    { studentIds: sid },
    { $pull: { studentIds: sid } }
  ).exec();

  const toDelete: mongoose.Types.ObjectId[] = [student.userId, student.parentUserId];
  if (student.adminAccessUserId) toDelete.push(student.adminAccessUserId);
  await Promise.all([
    ...toDelete.map((uid) => User.findByIdAndDelete(uid)),
    Student.findByIdAndDelete(id),
  ]);
  return true;
}
