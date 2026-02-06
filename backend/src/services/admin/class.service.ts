import mongoose from 'mongoose';
import { Class } from '../../models/Class.model';
import { IClass } from '../../models/Class.model';
import { Student } from '../../models/Student.model';
import { LessonDay } from '../../models/LessonDay.model';
import { Test } from '../../models/Test.model';

export interface CreateClassInput {
  name: string;
  description?: string;
}

export interface UpdateClassInput {
  name?: string;
  description?: string;
  teacherIds?: string[];
}

export async function createClass(input: CreateClassInput): Promise<IClass> {
  const doc = await Class.create({
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    teacherIds: [],
    studentIds: [],
  });
  return doc;
}

export async function listClasses() {
  const list = await Class.find()
    .populate('teacherIds', 'name')
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  return list.map((c) => ({
    ...c,
    studentCount: (c.studentIds as mongoose.Types.ObjectId[]).length,
  }));
}

/** 수업관리 진입용: 반 목록 + 오늘 날짜 기준 등록 교시 수 */
export async function listClassesForLessonManagement() {
  const list = await Class.find()
    .populate('teacherIds', 'name')
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayLessons = await LessonDay.find({
    date: { $gte: todayStart, $lt: todayEnd },
  })
    .select('classId periods')
    .lean()
    .exec();

  const periodCountByClassId: Record<string, number> = {};
  for (const ld of todayLessons) {
    const cid = (ld.classId as mongoose.Types.ObjectId).toString();
    periodCountByClassId[cid] = (ld.periods as unknown[]).length;
  }

  return list.map((c) => {
    const id = (c._id as mongoose.Types.ObjectId).toString();
    return {
      ...c,
      studentCount: (c.studentIds as mongoose.Types.ObjectId[]).length,
      todayPeriodCount: periodCountByClassId[id] ?? 0,
    };
  });
}

/** 시험관리 진입용: 반 목록 + 반별 시험 수 */
export async function listClassesForTestManagement() {
  const list = await Class.find()
    .populate('teacherIds', 'name')
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const counts = await Test.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>()
    .group({ _id: '$classId', count: { $sum: 1 } })
    .exec();
  const testCountByClassId: Record<string, number> = {};
  for (const row of counts) {
    testCountByClassId[row._id.toString()] = row.count;
  }

  return list.map((c) => {
    const id = (c._id as mongoose.Types.ObjectId).toString();
    return {
      ...c,
      studentCount: (c.studentIds as mongoose.Types.ObjectId[]).length,
      testCount: testCountByClassId[id] ?? 0,
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
