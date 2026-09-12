import mongoose from 'mongoose';
import {
  PersonalQuestionVideo,
  QUESTION_VIDEO_MODAL_COMPLETE_PERCENT,
} from '../../models/PersonalQuestionVideo.model';
import { Student } from '../../models/Student.model';
import { Teacher } from '../../models/Teacher.model';
import { User } from '../../models/User.model';
import { extractYoutubeVideoId } from '../../utils/youtube';
import {
  getAssignedStudentIds,
  getTeacherIdByUserId,
} from '../teacher/teacherClass.service';

export type QuestionVideoListItem = {
  _id: string;
  url: string;
  videoId: string;
  title: string;
  teacherId: string | null;
  teacherName: string;
  uploaderRole: 'admin' | 'teacher';
  createdAt: string;
  maxPercent: number;
  watchedSec: number;
  playTimeSec: number;
  durationSec: number;
  lastWatchedAt: string | null;
  canDelete: boolean;
};

async function assertCanManageStudent(
  studentId: string,
  userId: string,
  role: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return { ok: false, status: 400, error: '올바른 학생 ID가 아닙니다.' };
  }
  const student = await Student.findById(studentId).select('_id').lean().exec();
  if (!student) {
    return { ok: false, status: 404, error: '학생을 찾을 수 없습니다.' };
  }
  if (role === 'admin') return { ok: true };
  if (role !== 'teacher') {
    return { ok: false, status: 403, error: '권한이 없습니다.' };
  }
  const assigned = await getAssignedStudentIds(userId);
  if (!assigned.includes(studentId)) {
    return { ok: false, status: 403, error: '담당 학생이 아닙니다.' };
  }
  return { ok: true };
}

function toListItem(
  d: {
    _id: mongoose.Types.ObjectId;
    url: string;
    videoId: string;
    title?: string;
    teacherId?: mongoose.Types.ObjectId | null;
    uploaderName?: string;
    uploaderRole?: 'admin' | 'teacher';
    createdAt: Date;
    maxPercent?: number;
    watchedSec?: number;
    playTimeSec?: number;
    durationSec?: number;
    lastWatchedAt?: Date;
  },
  canDelete: boolean,
  teacherNameFallback?: string
): QuestionVideoListItem {
  const role = d.uploaderRole ?? 'teacher';
  const name =
    (d.uploaderName ?? '').trim() ||
    teacherNameFallback ||
    (role === 'admin' ? '관리자' : '');
  return {
    _id: d._id.toString(),
    url: d.url,
    videoId: d.videoId,
    title: (d.title ?? '').trim(),
    teacherId: d.teacherId ? d.teacherId.toString() : null,
    teacherName: name,
    uploaderRole: role,
    createdAt: d.createdAt?.toISOString?.() ?? String(d.createdAt),
    maxPercent: d.maxPercent ?? 0,
    watchedSec: d.watchedSec ?? 0,
    playTimeSec: d.playTimeSec ?? 0,
    durationSec: d.durationSec ?? 0,
    lastWatchedAt: d.lastWatchedAt ? d.lastWatchedAt.toISOString() : null,
    canDelete,
  };
}

/**
 * 학생별 질문 영상 목록.
 * - admin: 해당 학생의 전체 영상
 * - teacher: 본인이 등록한 영상만 (타 강사·관리자 등록분 비공개)
 */
export async function listForStudent(
  studentId: string,
  userId: string,
  role: string
): Promise<{ items: QuestionVideoListItem[] } | { error: string; status: number }> {
  const access = await assertCanManageStudent(studentId, userId, role);
  if (!access.ok) return { error: access.error, status: access.status };

  const filter: Record<string, unknown> = {
    studentId: new mongoose.Types.ObjectId(studentId),
  };

  let myTeacherId: mongoose.Types.ObjectId | null = null;
  if (role === 'teacher') {
    myTeacherId = await getTeacherIdByUserId(userId);
    if (!myTeacherId) {
      return { error: '강사 정보를 찾을 수 없습니다.', status: 403 };
    }
    filter.teacherId = myTeacherId;
  }

  const docs = await PersonalQuestionVideo.find(filter).sort({ createdAt: -1 }).lean().exec();

  const items: QuestionVideoListItem[] = docs.map((d) => {
    const tid = d.teacherId?.toString() ?? null;
    const canDelete =
      role === 'admin' ||
      (myTeacherId != null && tid != null && tid === myTeacherId.toString());
    return toListItem(d, canDelete);
  });

  return { items };
}

export async function createForStudent(
  studentId: string,
  userId: string,
  role: string,
  input: { url: string; title?: string }
): Promise<{ item: QuestionVideoListItem } | { error: string; status: number }> {
  if (role !== 'admin' && role !== 'teacher') {
    return { error: '권한이 없습니다.', status: 403 };
  }

  const access = await assertCanManageStudent(studentId, userId, role);
  if (!access.ok) return { error: access.error, status: access.status };

  const videoId = extractYoutubeVideoId(input.url ?? '');
  if (!videoId) {
    return { error: '올바른 유튜브 URL 또는 영상 ID를 입력해 주세요.', status: 400 };
  }

  let teacherId: mongoose.Types.ObjectId | null = null;
  let uploaderName = '관리자';
  const uploaderRole: 'admin' | 'teacher' = role === 'admin' ? 'admin' : 'teacher';

  if (role === 'teacher') {
    teacherId = await getTeacherIdByUserId(userId);
    if (!teacherId) {
      return { error: '강사 정보를 찾을 수 없습니다.', status: 403 };
    }
    const teacher = await Teacher.findById(teacherId).select('name').lean().exec();
    uploaderName = teacher?.name ?? '';
  } else {
    const user = await User.findById(userId).select('name').lean().exec();
    uploaderName = (user?.name ?? '').trim() || '관리자';
  }

  const url = (input.url ?? '').trim();
  const title = (input.title ?? '').trim();
  const created = await PersonalQuestionVideo.create({
    studentId: new mongoose.Types.ObjectId(studentId),
    teacherId,
    createdByUserId: new mongoose.Types.ObjectId(userId),
    uploaderRole,
    uploaderName,
    url,
    videoId,
    title,
  });

  return {
    item: toListItem(created, true),
  };
}

export async function deleteForStudent(
  studentId: string,
  videoId: string,
  userId: string,
  role: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const access = await assertCanManageStudent(studentId, userId, role);
  if (!access.ok) return { error: access.error, status: access.status };

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return { error: '올바른 영상 ID가 아닙니다.', status: 400 };
  }

  const doc = await PersonalQuestionVideo.findOne({
    _id: new mongoose.Types.ObjectId(videoId),
    studentId: new mongoose.Types.ObjectId(studentId),
  }).exec();

  if (!doc) {
    return { error: '영상을 찾을 수 없습니다.', status: 404 };
  }

  if (role === 'teacher') {
    const myTeacherId = await getTeacherIdByUserId(userId);
    if (!myTeacherId || !doc.teacherId || doc.teacherId.toString() !== myTeacherId.toString()) {
      return { error: '다른 사람이 등록한 영상은 삭제할 수 없습니다.', status: 403 };
    }
  }

  await doc.deleteOne();
  return { ok: true };
}

export { QUESTION_VIDEO_MODAL_COMPLETE_PERCENT };
