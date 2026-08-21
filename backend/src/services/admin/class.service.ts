import mongoose from 'mongoose';
import { Class } from '../../models/Class.model';
import { IClass } from '../../models/Class.model';
import { Student } from '../../models/Student.model';
import { LessonDay } from '../../models/LessonDay.model';
import { Test } from '../../models/Test.model';
import { Announcement } from '../../models/Announcement.model';
import { AnnouncementDismissal } from '../../models/AnnouncementDismissal.model';
import { deleteNotificationsForClass, deleteNotificationsForLessonDay } from '../notification.service';

export interface CreateClassInput {
  name: string;
  description?: string;
  teacherIds?: string[];
}

export interface UpdateClassInput {
  name?: string;
  description?: string;
  teacherIds?: string[];
}

export async function createClass(input: CreateClassInput): Promise<IClass> {
  const teacherIds = (input.teacherIds ?? []).map((tid) => new mongoose.Types.ObjectId(tid));
  const doc = await Class.create({
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    teacherIds,
    studentIds: [],
  });
  return doc;
}

/** teacherId가 있으면 해당 강사 담당 반만 */
export async function listClasses(teacherId?: mongoose.Types.ObjectId | null) {
  const filter = teacherId ? { teacherIds: teacherId } : {};
  const list = await Class.find(filter)
    .populate('teacherIds', 'name')
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  return list.map((c) => ({
    ...c,
    studentCount: (c.studentIds as mongoose.Types.ObjectId[]).length,
  }));
}

/** 수업관리 진입용: 반 목록 + 최근 수업 등록일. teacherId가 있으면 해당 강사 담당 반만. */
export async function listClassesForLessonManagement(teacherId?: mongoose.Types.ObjectId | null) {
  const filter = teacherId ? { teacherIds: teacherId } : {};
  const list = await Class.find(filter)
    .populate('teacherIds', 'name')
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const classIds = list.map((c) => c._id as mongoose.Types.ObjectId);
  const lastDateByClassId: Record<string, string | null> = {};

  if (classIds.length > 0) {
    const rows = await LessonDay.aggregate<{ _id: mongoose.Types.ObjectId; lastDate: Date }>([
      { $match: { classId: { $in: classIds }, 'periods.0': { $exists: true } } },
      { $group: { _id: '$classId', lastDate: { $max: '$date' } } },
    ]).exec();
    for (const row of rows) {
      lastDateByClassId[row._id.toString()] = row.lastDate.toISOString().slice(0, 10);
    }
  }

  return list.map((c) => {
    const id = (c._id as mongoose.Types.ObjectId).toString();
    return {
      ...c,
      studentCount: (c.studentIds as mongoose.Types.ObjectId[]).length,
      lastLessonDate: lastDateByClassId[id] ?? null,
    };
  });
}

/** 시험관리 진입용: 반 목록 + 최근 시험 등록일. teacherId가 있으면 해당 강사 담당 반만. */
export async function listClassesForTestManagement(teacherId?: mongoose.Types.ObjectId | null) {
  const filter = teacherId ? { teacherIds: teacherId } : {};
  const list = await Class.find(filter)
    .populate('teacherIds', 'name')
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const classIds = list.map((c) => c._id as mongoose.Types.ObjectId);
  const lastDateByClassId: Record<string, string | null> = {};

  if (classIds.length > 0) {
    const rows = await Test.aggregate<{ _id: mongoose.Types.ObjectId; lastDate: Date }>([
      { $match: { classId: { $in: classIds } } },
      { $group: { _id: '$classId', lastDate: { $max: '$createdAt' } } },
    ]).exec();
    for (const row of rows) {
      lastDateByClassId[row._id.toString()] = row.lastDate.toISOString().slice(0, 10);
    }
  }

  return list.map((c) => {
    const id = (c._id as mongoose.Types.ObjectId).toString();
    return {
      ...c,
      studentCount: (c.studentIds as mongoose.Types.ObjectId[]).length,
      lastTestDate: lastDateByClassId[id] ?? null,
    };
  });
}

export async function getClassById(id: string): Promise<IClass | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await Class.findById(id)
    .populate('teacherIds', 'name')
    .populate('studentIds', 'name school grade studentPhone parentPhone')
    .exec();
  return doc ?? null;
}

export async function updateClass(id: string, input: UpdateClassInput): Promise<IClass | null> {
  const doc = await Class.findById(id).exec();
  if (!doc) return null;

  if (input.name !== undefined) doc.name = input.name.trim();
  if (input.description !== undefined) doc.description = input.description?.trim() ?? '';
  if (input.teacherIds !== undefined) {
    doc.teacherIds = input.teacherIds.map((tid) => new mongoose.Types.ObjectId(tid));
  }
  await doc.save();
  return getClassById(id);
}

export async function deleteClass(id: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const classObjId = new mongoose.Types.ObjectId(id);

  const lessonDays = await LessonDay.find({ classId: classObjId }).select('_id').lean().exec();
  const lessonDayIds = lessonDays.map((d) => d._id.toString());

  const announcements = await Announcement.find({ classId: classObjId }).select('_id').lean().exec();
  const announcementIds = announcements.map((a) => a._id);

  await Promise.all([
    deleteNotificationsForClass(id),
    ...lessonDayIds.map((lessonDayId) => deleteNotificationsForLessonDay(lessonDayId)),
    LessonDay.deleteMany({ classId: classObjId }).exec(),
    announcementIds.length > 0
      ? AnnouncementDismissal.deleteMany({ announcementId: { $in: announcementIds } }).exec()
      : Promise.resolve(),
    Announcement.deleteMany({ classId: classObjId }).exec(),
  ]);

  const result = await Class.findByIdAndDelete(id);
  return result != null;
}

export async function addTeacherToClass(classId: string, teacherId: string): Promise<IClass | null> {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) return null;

  const classDoc = await Class.findById(classId).exec();
  if (!classDoc) return null;

  const tid = new mongoose.Types.ObjectId(teacherId);
  if (!classDoc.teacherIds) classDoc.teacherIds = [];
  if (classDoc.teacherIds.some((id) => id.toString() === tid.toString())) return getClassById(classId);
  classDoc.teacherIds.push(tid);
  await classDoc.save();
  return getClassById(classId);
}

export async function removeTeacherFromClass(
  classId: string,
  teacherId: string
): Promise<IClass | null> {
  const classDoc = await Class.findById(classId).exec();
  if (!classDoc) return null;

  const tid = new mongoose.Types.ObjectId(teacherId);
  classDoc.teacherIds = (classDoc.teacherIds || []).filter(
    (id) => id.toString() !== tid.toString()
  );
  await classDoc.save();
  return getClassById(classId);
}

export async function addStudentsToClass(
  classId: string,
  studentIds: string[]
): Promise<IClass | null> {
  const classDoc = await Class.findById(classId).exec();
  if (!classDoc) return null;

  const ids = classDoc.studentIds || [];
  const toAdd = studentIds
    .map((s) => new mongoose.Types.ObjectId(s))
    .filter((sid) => !ids.some((id) => id.toString() === sid.toString()));
  classDoc.studentIds = [...ids, ...toAdd];
  await classDoc.save();

  const classObjId = new mongoose.Types.ObjectId(classId);
  await Student.updateMany(
    { _id: { $in: toAdd } },
    { $set: { classId: classObjId } }
  ).exec();

  return getClassById(classId);
}

export async function removeStudentFromClass(
  classId: string,
  studentId: string
): Promise<IClass | null> {
  const classDoc = await Class.findById(classId).exec();
  if (!classDoc) return null;

  const sid = new mongoose.Types.ObjectId(studentId);
  classDoc.studentIds = (classDoc.studentIds || []).filter(
    (id) => id.toString() !== sid.toString()
  );
  await classDoc.save();

  await Student.findByIdAndUpdate(sid, { $unset: { classId: 1 } }).exec();

  return getClassById(classId);
}
