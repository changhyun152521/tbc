import mongoose from 'mongoose';
import { Teacher } from '../../models/Teacher.model';
import { Class } from '../../models/Class.model';
import { Student } from '../../models/Student.model';

/**
 * userId(User._id)로 Teacher._id 조회. 강사가 아니면 null.
 */
export async function getTeacherIdByUserId(userId: string): Promise<mongoose.Types.ObjectId | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const teacher = await Teacher.findOne({ userId: new mongoose.Types.ObjectId(userId) }).exec();
  return teacher ? teacher._id : null;
}

/**
 * admin: 전체 반 목록. teacher: 본인 담당 반만 (Class.teacherIds에 본인 Teacher._id 포함).
 */
export async function listClassesForTeacher(userId: string, role: string) {
  if (role === 'admin') {
    return Class.find().populate('teacherIds', 'name').sort({ name: 1 }).lean().exec();
  }
  const teacherId = await getTeacherIdByUserId(userId);
  if (!teacherId) return [];
  return Class.find({ teacherIds: teacherId })
    .populate('teacherIds', 'name')
    .sort({ name: 1 })
    .lean()
    .exec();
}

/**
 * 반 소속 학생 목록. admin 또는 해당 반 담당 강사만 접근 가능.
 * 기획 문서: Student.classId 기준으로 해당 반 학생 조회.
 */
export async function getClassStudents(classId: string, userId: string, role: string) {
  if (!mongoose.Types.ObjectId.isValid(classId)) return null;
  const classDoc = await Class.findById(classId).exec();
  if (!classDoc) return null;

  if (role !== 'admin') {
    const teacherId = await getTeacherIdByUserId(userId);
    if (!teacherId || !classDoc.teacherIds.some((id) => id.toString() === teacherId.toString())) {
      return null;
    }
  }

  const students = await Student.find({ classId: new mongoose.Types.ObjectId(classId) })
    .populate('userId', 'name loginId')
    .lean()
    .exec();
  return students;
}

/** 반 접근 권한: admin 또는 해당 반 담당 강사 */
export async function canAccessClass(classId: string, userId: string, role: string): Promise<boolean> {
  if (role === 'admin') return true;
  if (!mongoose.Types.ObjectId.isValid(classId)) return false;
  const teacherId = await getTeacherIdByUserId(userId);
  if (!teacherId) return false;
  const classDoc = await Class.findById(classId).select('teacherIds').exec();
  if (!classDoc) return false;
  return classDoc.teacherIds.some((id) => id.toString() === teacherId.toString());
}
