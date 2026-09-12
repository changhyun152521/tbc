import mongoose from 'mongoose';
import {
  PersonalQuestionVideo,
  QUESTION_VIDEO_MODAL_COMPLETE_PERCENT,
} from '../../models/PersonalQuestionVideo.model';

export type StudentQuestionVideoItem = {
  _id: string;
  url: string;
  videoId: string;
  title: string;
  teacherName: string;
  createdAt: string;
  maxPercent: number;
  lastPositionSec: number;
  watchedSec: number;
  playTimeSec: number;
  durationSec: number;
};

function toItem(d: {
  _id: mongoose.Types.ObjectId;
  url: string;
  videoId: string;
  title?: string;
  uploaderName?: string;
  createdAt: Date;
  maxPercent?: number;
  lastPositionSec?: number;
  watchedSec?: number;
  playTimeSec?: number;
  durationSec?: number;
}): StudentQuestionVideoItem {
  return {
    _id: d._id.toString(),
    url: d.url,
    videoId: d.videoId,
    title: (d.title ?? '').trim(),
    teacherName: (d.uploaderName ?? '').trim(),
    createdAt: d.createdAt?.toISOString?.() ?? String(d.createdAt),
    maxPercent: d.maxPercent ?? 0,
    lastPositionSec: d.lastPositionSec ?? 0,
    watchedSec: d.watchedSec ?? 0,
    playTimeSec: d.playTimeSec ?? 0,
    durationSec: d.durationSec ?? 0,
  };
}

/** 대시보드용: 학생 본인 영상 전체 */
export async function listForStudent(studentId: string): Promise<StudentQuestionVideoItem[]> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return [];

  const docs = await PersonalQuestionVideo.find({
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return docs.map(toItem);
}

/** 로그인 모달용: 진행률이 기준 미만인 영상만 */
export async function listPendingForStudent(studentId: string): Promise<StudentQuestionVideoItem[]> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return [];

  const docs = await PersonalQuestionVideo.find({
    studentId: new mongoose.Types.ObjectId(studentId),
    maxPercent: { $lt: QUESTION_VIDEO_MODAL_COMPLETE_PERCENT },
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return docs.map(toItem);
}

export async function getOneForStudent(
  studentId: string,
  videoDocId: string
): Promise<StudentQuestionVideoItem | { error: string; status: number }> {
  if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(videoDocId)) {
    return { error: '올바른 ID가 아닙니다.', status: 400 };
  }

  const doc = await PersonalQuestionVideo.findOne({
    _id: new mongoose.Types.ObjectId(videoDocId),
    studentId: new mongoose.Types.ObjectId(studentId),
  })
    .lean()
    .exec();

  if (!doc) {
    return { error: '영상을 찾을 수 없습니다.', status: 404 };
  }

  return toItem(doc);
}

export async function upsertProgress(input: {
  studentId: string;
  videoDocId: string;
  youtubeVideoId: string;
  currentTime: number;
  watchedSec: number;
  playTimeSec: number;
  durationSec: number;
}): Promise<
  | { maxPercent: number; watchedSec: number; playTimeSec: number; completed: boolean }
  | { error: string; status: number }
> {
  if (!mongoose.Types.ObjectId.isValid(input.videoDocId)) {
    return { error: '올바른 ID가 아닙니다.', status: 400 };
  }

  const doc = await PersonalQuestionVideo.findOne({
    _id: new mongoose.Types.ObjectId(input.videoDocId),
    studentId: new mongoose.Types.ObjectId(input.studentId),
  }).exec();

  if (!doc) {
    return { error: '영상을 찾을 수 없습니다.', status: 404 };
  }

  if (input.youtubeVideoId && doc.videoId !== input.youtubeVideoId) {
    return { error: '영상 정보가 일치하지 않습니다.', status: 400 };
  }

  const duration = Math.max(0, Number(input.durationSec) || 0);
  const currentTime = Math.max(0, Number(input.currentTime) || 0);
  let incomingWatched = Math.max(0, Number(input.watchedSec) || 0);
  let incomingPlayTime = Math.max(0, Number(input.playTimeSec) || 0);
  if (duration > 0) incomingWatched = Math.min(incomingWatched, duration + 1);

  const now = new Date();
  const existingPlayTime = doc.playTimeSec ?? doc.watchedSec ?? 0;
  const elapsed = doc.lastProgressAt ? (now.getTime() - doc.lastProgressAt.getTime()) / 1000 : 15;
  const allowedIncrease = Math.max(2, elapsed + 8);

  let watchedSec = Math.min(incomingWatched, (doc.watchedSec ?? 0) + allowedIncrease);
  watchedSec = Math.max(watchedSec, doc.watchedSec ?? 0);
  let playTimeSec = Math.min(incomingPlayTime, existingPlayTime + allowedIncrease);
  playTimeSec = Math.max(playTimeSec, existingPlayTime);

  const percent = duration > 0 ? Math.min(100, (watchedSec / duration) * 100) : 0;
  const maxPercent = Math.max(doc.maxPercent ?? 0, percent);
  const completed = maxPercent >= QUESTION_VIDEO_MODAL_COMPLETE_PERCENT;

  doc.durationSec = duration > 0 ? duration : doc.durationSec ?? 0;
  doc.watchedSec = watchedSec;
  doc.playTimeSec = playTimeSec;
  doc.maxPercent = maxPercent;
  doc.lastPositionSec = duration > 0 ? Math.min(currentTime, duration) : currentTime;
  doc.lastWatchedAt = now;
  doc.lastProgressAt = now;
  if (completed && !doc.completedAt) doc.completedAt = now;
  await doc.save();

  return { maxPercent, watchedSec, playTimeSec, completed };
}
