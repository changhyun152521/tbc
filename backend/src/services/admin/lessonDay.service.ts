import mongoose from 'mongoose';
import { LessonDay } from '../../models/LessonDay.model';
import type { ILessonDay, IPeriod, IStudentRecord } from '../../models/LessonDay.model';
import { Class } from '../../models/Class.model';

export interface ListLessonDaysFilter {
  dateFrom?: string;
  dateTo?: string;
  classId?: string;
  teacherId?: string;
}

export async function createLessonDay(classId: string, date: string): Promise<ILessonDay | null> {
  if (!mongoose.Types.ObjectId.isValid(classId)) return null;
  const classDoc = await Class.findById(classId).exec();
  if (!classDoc) return null;

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const existing = await LessonDay.findOne({ classId: new mongoose.Types.ObjectId(classId), date: d }).exec();
  if (existing) return null;

  const lessonDay = await LessonDay.create({
    classId: new mongoose.Types.ObjectId(classId),
    date: d,
    periods: [],
  });
  return lessonDay;
}

export async function listLessonDays(filter: ListLessonDaysFilter = {}) {
  const q: Record<string, unknown> = {};
  if (filter.dateFrom || filter.dateTo) {
    q.date = {};
    if (filter.dateFrom) (q.date as Record<string, Date>).$gte = new Date(filter.dateFrom);
    if (filter.dateTo) (q.date as Record<string, Date>).$lte = new Date(filter.dateTo);
  }
  if (filter.classId && mongoose.Types.ObjectId.isValid(filter.classId)) {
    q.classId = new mongoose.Types.ObjectId(filter.classId);
  }
  if (filter.teacherId && mongoose.Types.ObjectId.isValid(filter.teacherId)) {
    q['periods.teacherId'] = new mongoose.Types.ObjectId(filter.teacherId);
  }

  const list = await LessonDay.find(q)
    .populate('classId', 'name')
    .sort({ date: -1 })
    .lean()
    .exec();

  return list.map((row) => ({
    _id: row._id,
    classId: row.classId,
    className: (row.classId as { name?: string })?.name ?? '-',
    date: row.date,
    periodCount: (row.periods as IPeriod[]).length,
  }));
}

export async function getLessonDayById(id: string): Promise<ILessonDay | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await LessonDay.findById(id)
    .populate('classId', 'name studentIds')
    .populate('periods.teacherId', 'name')
    .populate('periods.records.studentId', 'name')
    .exec();
  return doc ?? null;
}

/** 반 ID + 날짜로 해당 날짜의 수업일 조회 (없으면 null) */
export async function getLessonDayByClassAndDate(classId: string, dateStr: string): Promise<ILessonDay | null> {
  if (!mongoose.Types.ObjectId.isValid(classId)) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const doc = await LessonDay.findOne({
    classId: new mongoose.Types.ObjectId(classId),
    date: { $gte: start, $lt: end },
  })
    .populate('classId', 'name studentIds')
    .populate('periods.teacherId', 'name')
    .populate('periods.records.studentId', 'name')
    .exec();
  return doc ?? null;
}

export async function updateLessonDay(
  id: string,
  payload: { date?: string; classId?: string }
): Promise<ILessonDay | null> {
  const lesson = await LessonDay.findById(id).exec();
  if (!lesson) return null;
  if (payload.date != null) {
    const d = new Date(payload.date);
    if (!Number.isNaN(d.getTime())) lesson.date = d;
  }
  if (payload.classId != null && mongoose.Types.ObjectId.isValid(payload.classId)) {
    const classDoc = await Class.findById(payload.classId).exec();
    if (!classDoc) return null;
    lesson.classId = new mongoose.Types.ObjectId(payload.classId);
  }
  await lesson.save();
  return getLessonDayById(id);
}

export async function deleteLessonDay(id: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const result = await LessonDay.findByIdAndDelete(id);
  return result != null;
}

export async function addPeriod(lessonDayId: string, teacherId: string): Promise<ILessonDay | null> {
  const lesson = await LessonDay.findById(lessonDayId).populate('classId', 'studentIds').exec();
  if (!lesson) return null;
  if (!mongoose.Types.ObjectId.isValid(teacherId)) return null;

  const classDoc = lesson.classId as { studentIds?: mongoose.Types.ObjectId[] };
  const studentIds = classDoc.studentIds ?? [];
  const records: IStudentRecord[] = studentIds.map((sid) => ({
    studentId: sid,
    attendance: '' as const,
    homework: '' as const,
  }));

  lesson.periods.push({
    teacherId: new mongoose.Types.ObjectId(teacherId),
    records,
  });
  await lesson.save();
  return getLessonDayById(lessonDayId);
}

export async function removePeriod(lessonDayId: string, periodIndex: number): Promise<ILessonDay | null> {
  const lesson = await LessonDay.findById(lessonDayId).exec();
  if (!lesson) return null;
  if (periodIndex < 0 || periodIndex >= lesson.periods.length) return null;

  lesson.periods.splice(periodIndex, 1);
  await lesson.save();
  return getLessonDayById(lessonDayId);
}

export async function updatePeriod(
  lessonDayId: string,
  periodIndex: number,
  payload: {
    teacherId?: string;
    memo?: string;
    homeworkDescription?: string;
    homeworkDueDate?: string | Date | null;
    records?: { studentId: string; attendance: 'O' | 'X' | ''; homework: 'O' | 'X' | ''; note?: string }[];
  }
): Promise<ILessonDay | null> {
  const lesson = await LessonDay.findById(lessonDayId).exec();
  if (!lesson) return null;
  if (periodIndex < 0 || periodIndex >= lesson.periods.length) return null;

  const period = lesson.periods[periodIndex];
  if (payload.teacherId != null) period.teacherId = new mongoose.Types.ObjectId(payload.teacherId);
  if (payload.memo !== undefined) (period as IPeriod & { memo?: string }).memo = payload.memo ?? '';
  if (payload.homeworkDescription !== undefined) (period as IPeriod & { homeworkDescription?: string }).homeworkDescription = payload.homeworkDescription ?? '';
  if (payload.homeworkDueDate !== undefined) {
    const p = period as IPeriod & { homeworkDueDate?: Date };
    if (payload.homeworkDueDate === null || payload.homeworkDueDate === '') {
      p.homeworkDueDate = undefined;
    } else {
      const d = typeof payload.homeworkDueDate === 'string' ? new Date(payload.homeworkDueDate) : payload.homeworkDueDate;
      p.homeworkDueDate = Number.isNaN(d.getTime()) ? undefined : d;
    }
  }
  if (payload.records != null) {
    period.records = payload.records.map((r) => ({
      studentId: new mongoose.Types.ObjectId(r.studentId),
      attendance: r.attendance,
      homework: r.homework,
      note: r.note ?? '',
    }));
  }
  await lesson.save();
  return getLessonDayById(lessonDayId);
}
