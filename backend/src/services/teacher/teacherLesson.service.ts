import mongoose from 'mongoose';
import { Lesson } from '../../models/Lesson.model';
import { ILesson } from '../../models/Lesson.model';
import { canAccessClass } from './teacherClass.service';

export interface CreateLessonInput {
  classId: string;
  date: Date;
  period: string;
  progress?: string;
  homework?: string;
  homeworkDueDate?: Date;
  attendanceStatus?: string;
  homeworkDone?: boolean;
}

export interface UpdateLessonInput {
  date?: Date;
  period?: string;
  progress?: string;
  homework?: string;
  homeworkDueDate?: Date;
  attendanceStatus?: string;
  homeworkDone?: boolean;
}

export async function createLesson(
  input: CreateLessonInput,
  userId: string,
  role: string
): Promise<ILesson | null> {
  const allowed = await canAccessClass(input.classId, userId, role);
  if (!allowed) return null;

  const lesson = await Lesson.create({
    classId: new mongoose.Types.ObjectId(input.classId),
    date: input.date,
    period: input.period,
    progress: input.progress ?? '',
    homework: input.homework ?? '',
    homeworkDueDate: input.homeworkDueDate,
    attendanceStatus: input.attendanceStatus ?? '',
    homeworkDone: input.homeworkDone ?? false,
  });
  return lesson;
}

export async function listLessonsByClass(
  classId: string,
  userId: string,
  role: string,
  from?: string,
  to?: string
) {
  const allowed = await canAccessClass(classId, userId, role);
  if (!allowed) return null;

  const filter: Record<string, unknown> = { classId: new mongoose.Types.ObjectId(classId) };
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  return Lesson.find(filter).sort({ date: -1, period: 1 }).lean().exec();
}

export async function getLessonById(
  lessonId: string,
  userId: string,
  role: string
): Promise<ILesson | null> {
  const lesson = await Lesson.findById(lessonId).exec();
  if (!lesson) return null;
  const allowed = await canAccessClass(lesson.classId.toString(), userId, role);
  if (!allowed) return null;
  return lesson;
}

export async function updateLesson(
  lessonId: string,
  input: UpdateLessonInput,
  userId: string,
  role: string
): Promise<ILesson | null> {
  const lesson = await Lesson.findById(lessonId).exec();
  if (!lesson) return null;
  const allowed = await canAccessClass(lesson.classId.toString(), userId, role);
  if (!allowed) return null;

  if (input.date !== undefined) lesson.date = input.date;
  if (input.period !== undefined) lesson.period = input.period;
  if (input.progress !== undefined) lesson.progress = input.progress;
  if (input.homework !== undefined) lesson.homework = input.homework;
  if (input.homeworkDueDate !== undefined) lesson.homeworkDueDate = input.homeworkDueDate;
  if (input.attendanceStatus !== undefined) lesson.attendanceStatus = input.attendanceStatus;
  if (input.homeworkDone !== undefined) lesson.homeworkDone = input.homeworkDone;
  await lesson.save();
  return lesson;
}

export async function deleteLesson(
  lessonId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const lesson = await Lesson.findById(lessonId).exec();
  if (!lesson) return false;
  const allowed = await canAccessClass(lesson.classId.toString(), userId, role);
  if (!allowed) return false;
  await Lesson.findByIdAndDelete(lessonId);
  return true;
}
