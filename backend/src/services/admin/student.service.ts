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
}

export interface ListStudentsResult {
  list: (IStudent & { classCount: number })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
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

  const [studentUser, parentUser] = await Promise.all([
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
  ]);

  const student = await Student.create({
    name: input.name.trim(),
    school: input.school.trim(),
    grade: input.grade.trim(),
    studentPhone: input.studentPhone,
    parentPhone: input.parentPhone,
    userId: studentUser._id,
    parentUserId: parentUser._id,
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
    Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    Student.countDocuments(filter).exec(),
  ]);

  const withClassCount = await Promise.all(
    list.map(async (s) => {
      const classCount = await Class.countDocuments({ studentIds: s._id }).exec();
      return { ...s, classCount };
    })
  );

  return {
    list: withClassCount as unknown as (IStudent & { classCount: number })[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getStudentById(id: string): Promise<IStudent | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const student = await Student.findById(id)
    .populate('userId', 'loginId name phone')
    .populate('parentUserId', 'loginId name phone')
    .populate('classId', 'name description')
    .exec();
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

  await Promise.all([
    User.findByIdAndDelete(student.userId),
    User.findByIdAndDelete(student.parentUserId),
    Student.findByIdAndDelete(id),
  ]);
  return true;
}
