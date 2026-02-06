import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../../models/User.model';
import { Teacher } from '../../models/Teacher.model';
import { ITeacher } from '../../models/Teacher.model';
import { Class } from '../../models/Class.model';

const SALT_ROUNDS = 10;

export interface CreateTeacherInput {
  name: string;
  loginId: string;
  password: string;
  phone?: string;
  description?: string;
}

export interface UpdateTeacherInput {
  name?: string;
  loginId?: string;
  password?: string;
  phone?: string;
  description?: string;
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function createTeacher(input: CreateTeacherInput): Promise<ITeacher> {
  const user = await User.create({
    role: 'teacher',
    loginId: input.loginId.trim(),
    passwordHash: await hashPassword(input.password),
    name: input.name.trim(),
    phone: input.phone?.trim() ?? '',
  });

  const teacher = await Teacher.create({
    name: input.name.trim(),
    userId: user._id,
    description: input.description?.trim() ?? '',
  });
  return teacher;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listTeachers(search?: string) {
  let list: Array<Record<string, unknown>>;
  if (search?.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    const users = await User.find({
      role: 'teacher',
      $or: [{ name: regex }, { loginId: regex }],
    })
      .select('_id')
      .lean()
      .exec();
    const userIds = users.map((u) => u._id);
    list = await Teacher.find({ userId: { $in: userIds } })
      .populate('userId', 'loginId name phone')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  } else {
    list = await Teacher.find()
      .populate('userId', 'loginId name phone')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
  const classes = await Class.find().select('teacherIds').lean().exec();
  const countByTeacher = new Map<string, number>();
  for (const c of classes) {
    const ids = (c.teacherIds as mongoose.Types.ObjectId[]) ?? [];
    for (const tid of ids) {
      const key = tid.toString();
      countByTeacher.set(key, (countByTeacher.get(key) ?? 0) + 1);
    }
  }
  return list.map((t) => ({
    ...t,
    classCount: countByTeacher.get((t._id as mongoose.Types.ObjectId).toString()) ?? 0,
  }));
}

export async function getTeacherById(id: string): Promise<ITeacher | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const teacher = await Teacher.findById(id).populate('userId', 'loginId name phone').exec();
  return teacher ?? null;
}

export async function updateTeacher(id: string, input: UpdateTeacherInput): Promise<ITeacher | null> {
  const teacher = await Teacher.findById(id).exec();
  if (!teacher) return null;

  const user = await User.findById(teacher.userId).exec();
  if (!user) return null;

  if (input.name !== undefined) {
    teacher.name = input.name.trim();
    user.name = input.name.trim();
  }
  if (input.loginId !== undefined) user.loginId = input.loginId.trim();
  if (input.password !== undefined && input.password) {
    user.passwordHash = await hashPassword(input.password);
  }
  if (input.phone !== undefined) user.phone = input.phone.trim();
  if (input.description !== undefined) teacher.description = input.description?.trim() ?? '';

  await Promise.all([teacher.save(), user.save()]);
  return getTeacherById(id);
}

export async function deleteTeacher(id: string): Promise<boolean> {
  const teacher = await Teacher.findById(id).exec();
  if (!teacher) return false;

  await Class.updateMany(
    { teacherIds: teacher._id },
    { $pull: { teacherIds: teacher._id } }
  );
  await User.findByIdAndDelete(teacher.userId);
  await Teacher.findByIdAndDelete(id);
  return true;
}
