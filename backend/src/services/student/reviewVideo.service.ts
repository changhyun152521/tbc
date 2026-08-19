import mongoose from 'mongoose';
import { LessonDay } from '../../models/LessonDay.model';
import type { IPeriod, IStudentRecord, IReviewVideo } from '../../models/LessonDay.model';
import { VideoWatchProgress } from '../../models/VideoWatchProgress.model';
import { Student } from '../../models/Student.model';
import { Class } from '../../models/Class.model';
import { Teacher } from '../../models/Teacher.model';
import * as studentDataService from '../student/studentData.service';

const COMPLETE_PERCENT = 90;
const PENDING_DAYS = 14;

function periodIdOf(period: IPeriod & { _id?: mongoose.Types.ObjectId }): string {
  return period._id ? period._id.toString() : '';
}

function teacherIdStr(period: { teacherId?: unknown }): string {
  const t = period.teacherId;
  if (!t) return '';
  if (typeof t === 'object' && t !== null && '_id' in t) {
    return String((t as { _id: unknown })._id);
  }
  return String(t);
}

function resolveTeacherName(
  period: { teacherId?: mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId; name?: string } },
  nameById: Map<string, string>
): string {
  const t = period.teacherId;
  if (typeof t === 'object' && t !== null && 'name' in t && typeof (t as { name?: string }).name === 'string') {
    const populated = (t as { name: string }).name.trim();
    if (populated) return populated;
  }
  const id = teacherIdStr(period);
  return id ? (nameById.get(id) ?? '') : '';
}

/** 교시의 reviewVideos 배열을 반환. 없으면 레거시 단일 필드에서 생성 */
export function getReviewVideos(period: IPeriod): IReviewVideo[] {
  const videos = (period.reviewVideos ?? []) as IReviewVideo[];
  if (videos.length > 0) return videos;
  const vid = (period.reviewVideoId ?? '').trim();
  if (!vid) return [];
  return [{ url: period.reviewVideoUrl ?? '', videoId: vid, title: '', order: 0, durationSec: 0 }];
}

type ProgressLite = {
  videoIndex?: number;
  watchedSec?: number;
  playTimeSec?: number;
  durationSec?: number;
};

/** 교시 전체: 각 영상 길이 합 대비 실제 시청 초 합 */
export function aggregatePeriodWatch(videos: IReviewVideo[], progresses: ProgressLite[]) {
  const byIndex = new Map(progresses.map((p) => [p.videoIndex ?? 0, p]));
  let watchedSec = 0;
  let playTimeSec = 0;
  let totalDuration = 0;
  videos.forEach((rv, i) => {
    const p = byIndex.get(i);
    const duration = Math.max(rv.durationSec ?? 0, p?.durationSec ?? 0);
    const watched = Math.max(0, p?.watchedSec ?? 0);
    totalDuration += duration;
    watchedSec += duration > 0 ? Math.min(watched, duration) : watched;
    playTimeSec += p?.playTimeSec ?? p?.watchedSec ?? 0;
  });
  const totalPercent = totalDuration > 0 ? Math.min(100, (watchedSec / totalDuration) * 100) : 0;
  return { watchedSec, playTimeSec, totalDuration, totalPercent };
}

export interface VideoInfo {
  videoIndex: number;
  youtubeVideoId: string;
  title: string;
  lastPositionSec: number;
  maxPercent: number;
  playTimeSec: number;
  watchedSec: number;
  durationSec: number;
  completed: boolean;
}

export interface PeriodVideoData {
  lessonDayId: string;
  periodId: string;
  date: string;
  period: number;
  videos: VideoInfo[];
  /** 전체 진행률: 총 시청초 / 총 길이 */
  totalPercent: number;
  totalDurationSec: number;
  totalWatchedSec: number;
}

export async function getReviewVideosForStudent(
  studentId: string,
  lessonDayId: string,
  periodId: string
): Promise<PeriodVideoData | { error: string; status: number }> {
  if (!mongoose.Types.ObjectId.isValid(lessonDayId) || !mongoose.Types.ObjectId.isValid(periodId)) {
    return { error: '올바른 ID가 아닙니다.', status: 400 };
  }
  const day = await LessonDay.findById(lessonDayId).lean().exec();
  if (!day) return { error: '수업을 찾을 수 없습니다.', status: 404 };
  const classes = await studentDataService.getStudentClasses(studentId);
  if (!classes.some((c) => c._id.toString() === day.classId.toString())) {
    return { error: '이 수업에 대한 권한이 없습니다.', status: 403 };
  }
  const periods = (day.periods || []) as (IPeriod & { _id?: mongoose.Types.ObjectId })[];
  const idx = periods.findIndex((p) => p._id?.toString() === periodId);
  if (idx < 0) return { error: '교시를 찾을 수 없습니다.', status: 404 };
  const period = periods[idx];
  const reviewVideos = getReviewVideos(period);
  if (reviewVideos.length === 0) return { error: '등록된 복습 영상이 없습니다.', status: 404 };

  const progresses = await VideoWatchProgress.find({
    studentId: new mongoose.Types.ObjectId(studentId),
    lessonDayId: new mongoose.Types.ObjectId(lessonDayId),
    periodId: new mongoose.Types.ObjectId(periodId),
  })
    .lean()
    .exec();

  const progressByIndex = new Map(progresses.map((p) => [p.videoIndex ?? 0, p]));

  const date = day.date instanceof Date ? day.date.toISOString().slice(0, 10) : String(day.date).slice(0, 10);

  const videos: VideoInfo[] = reviewVideos.map((rv, i) => {
    const prog = progressByIndex.get(i);
    const watchedSec = prog?.watchedSec ?? 0;
    const durationSec = Math.max(rv.durationSec ?? 0, prog?.durationSec ?? 0);
    const maxPercent =
      durationSec > 0
        ? Math.min(100, (watchedSec / durationSec) * 100)
        : prog?.maxPercent ?? 0;
    return {
      videoIndex: i,
      youtubeVideoId: rv.videoId,
      title: rv.title ?? '',
      lastPositionSec: prog?.lastPositionSec ?? 0,
      maxPercent,
      playTimeSec: prog?.playTimeSec ?? 0,
      watchedSec,
      durationSec,
      completed: maxPercent >= COMPLETE_PERCENT,
    };
  });

  const totals = aggregatePeriodWatch(reviewVideos, progresses);

  return {
    lessonDayId,
    periodId,
    date,
    period: idx + 1,
    videos,
    totalPercent: totals.totalPercent,
    totalDurationSec: totals.totalDuration,
    totalWatchedSec: totals.watchedSec,
  };
}

/** 하위 호환 단일 영상 조회 (videoIndex=0 고정) */
export async function getReviewVideoForStudent(
  studentId: string,
  lessonDayId: string,
  periodId: string
): Promise<{ youtubeVideoId: string; lessonDayId: string; periodId: string; date: string; period: number; lastPositionSec: number; maxPercent: number; playTimeSec: number; watchedSec: number } | { error: string; status: number }> {
  const result = await getReviewVideosForStudent(studentId, lessonDayId, periodId);
  if ('error' in result) return result;
  const v = result.videos[0];
  if (!v) return { error: '등록된 복습 영상이 없습니다.', status: 404 };
  return {
    youtubeVideoId: v.youtubeVideoId,
    lessonDayId,
    periodId,
    date: result.date,
    period: result.period,
    lastPositionSec: v.lastPositionSec,
    maxPercent: v.maxPercent,
    playTimeSec: v.playTimeSec,
    watchedSec: v.watchedSec,
  };
}

export async function upsertProgress(input: {
  studentId: string;
  lessonDayId: string;
  periodId: string;
  videoIndex: number;
  youtubeVideoId: string;
  currentTime: number;
  watchedSec: number;
  playTimeSec: number;
  durationSec: number;
}): Promise<{ maxPercent: number; watchedSec: number; playTimeSec: number; completed: boolean; totalPercent: number } | { error: string; status: number }> {
  if (!mongoose.Types.ObjectId.isValid(input.lessonDayId) || !mongoose.Types.ObjectId.isValid(input.periodId)) {
    return { error: '올바른 ID가 아닙니다.', status: 400 };
  }

  const duration = Math.max(0, Number(input.durationSec) || 0);
  const currentTime = Math.max(0, Number(input.currentTime) || 0);
  const videoIndex = Math.max(0, Number(input.videoIndex) || 0);
  let incomingWatched = Math.max(0, Number(input.watchedSec) || 0);
  let incomingPlayTime = Math.max(0, Number(input.playTimeSec) || 0);
  if (duration > 0) incomingWatched = Math.min(incomingWatched, duration + 1);

  const now = new Date();
  const existing = await VideoWatchProgress.findOne({
    studentId: new mongoose.Types.ObjectId(input.studentId),
    lessonDayId: new mongoose.Types.ObjectId(input.lessonDayId),
    periodId: new mongoose.Types.ObjectId(input.periodId),
    videoIndex,
  }).exec();

  const existingPlayTime = existing?.playTimeSec ?? existing?.watchedSec ?? 0;
  let watchedSec = incomingWatched;
  let playTimeSec = incomingPlayTime;
  if (existing) {
    const elapsed = existing.lastProgressAt ? (now.getTime() - existing.lastProgressAt.getTime()) / 1000 : 15;
    const allowedIncrease = Math.max(2, elapsed + 8);
    watchedSec = Math.min(incomingWatched, existing.watchedSec + allowedIncrease);
    watchedSec = Math.max(watchedSec, existing.watchedSec);
    playTimeSec = Math.min(incomingPlayTime, existingPlayTime + allowedIncrease);
    playTimeSec = Math.max(playTimeSec, existingPlayTime);
  }

  const percent = duration > 0 ? Math.min(100, (watchedSec / duration) * 100) : 0;
  const maxPercent = existing ? Math.max(existing.maxPercent, percent) : percent;
  const completed = maxPercent >= COMPLETE_PERCENT;

  const update = {
    youtubeVideoId: input.youtubeVideoId,
    videoIndex,
    durationSec: duration > 0 ? duration : existing?.durationSec ?? 0,
    watchedSec,
    playTimeSec,
    maxPercent,
    lastPositionSec: duration > 0 ? Math.min(currentTime, duration) : currentTime,
    lastWatchedAt: now,
    lastProgressAt: now,
    completedAt: completed ? existing?.completedAt ?? now : existing?.completedAt,
  };

  await VideoWatchProgress.findOneAndUpdate(
    {
      studentId: new mongoose.Types.ObjectId(input.studentId),
      lessonDayId: new mongoose.Types.ObjectId(input.lessonDayId),
      periodId: new mongoose.Types.ObjectId(input.periodId),
      videoIndex,
    },
    { $set: update },
    { upsert: true, new: true }
  ).exec();

  const day = await LessonDay.findById(input.lessonDayId).exec();
  const period = day
    ? ((day.periods || []) as (IPeriod & { _id?: mongoose.Types.ObjectId })[]).find(
        (p) => p._id?.toString() === input.periodId
      )
    : undefined;
  if (day && period && duration > 0) {
    const videos = (period.reviewVideos ?? []) as IReviewVideo[];
    if (videos[videoIndex] && (videos[videoIndex].durationSec ?? 0) < duration) {
      videos[videoIndex].durationSec = duration;
      period.reviewVideos = videos;
      await day.save();
    }
  }

  const allProgresses = await VideoWatchProgress.find({
    studentId: new mongoose.Types.ObjectId(input.studentId),
    lessonDayId: new mongoose.Types.ObjectId(input.lessonDayId),
    periodId: new mongoose.Types.ObjectId(input.periodId),
  })
    .lean()
    .exec();

  const reviewVideos = period ? getReviewVideos(period) : [];
  const totals = aggregatePeriodWatch(reviewVideos, allProgresses);

  return { maxPercent, watchedSec, playTimeSec, completed, totalPercent: totals.totalPercent };
}

export async function listPendingForStudent(studentId: string) {
  const from = new Date();
  from.setDate(from.getDate() - PENDING_DAYS);
  from.setHours(0, 0, 0, 0);

  const classIds = await studentDataService.getStudentClasses(studentId);
  if (classIds.length === 0) return [];
  const ids = classIds.map((c) => c._id);
  const classNameById = new Map(classIds.map((c) => [c._id.toString(), c.name]));

  const days = await LessonDay.find({
    classId: { $in: ids },
    date: { $gte: from },
  })
    .populate('periods.teacherId', 'name')
    .sort({ date: -1 })
    .lean()
    .exec();

  const teacherIdSet = new Set<string>();
  for (const day of days) {
    for (const period of day.periods || []) {
      const id = teacherIdStr(period);
      if (id) teacherIdSet.add(id);
    }
  }
  const teacherDocs =
    teacherIdSet.size > 0
      ? await Teacher.find({ _id: { $in: [...teacherIdSet] } })
          .select('name')
          .lean()
          .exec()
      : [];
  const teacherNameById = new Map(teacherDocs.map((t) => [t._id.toString(), t.name]));

  const items: {
    lessonDayId: string;
    periodId: string;
    className: string;
    date: string;
    period: number;
    teacherName: string;
    attendance: string;
    maxPercent: number;
    videoCount: number;
  }[] = [];

  for (const day of days) {
    const periods = (day.periods || []) as (IPeriod & {
      _id?: mongoose.Types.ObjectId;
      teacherId?: mongoose.Types.ObjectId | { name?: string };
    })[];
    periods.forEach((period, idx) => {
      const reviewVideos = getReviewVideos(period);
      if (reviewVideos.length === 0) return;
      const record = (period.records || []).find((r: IStudentRecord) => r.studentId?.toString() === studentId);
      if ((record?.attendance ?? '') !== 'X') return;
      const pid = periodIdOf(period);
      if (!pid) return;
      items.push({
        lessonDayId: day._id.toString(),
        periodId: pid,
        className: classNameById.get(day.classId.toString()) ?? '',
        date: day.date instanceof Date ? day.date.toISOString().slice(0, 10) : String(day.date).slice(0, 10),
        period: idx + 1,
        teacherName: resolveTeacherName(period, teacherNameById),
        attendance: 'X',
        maxPercent: 0,
        videoCount: reviewVideos.length,
      });
    });
  }

  if (items.length === 0) return [];

  const periodVideos = new Map<string, IReviewVideo[]>();
  for (const day of days) {
    const periods = (day.periods || []) as (IPeriod & { _id?: mongoose.Types.ObjectId })[];
    for (const period of periods) {
      const pid = periodIdOf(period);
      if (!pid) continue;
      periodVideos.set(`${day._id.toString()}-${pid}`, getReviewVideos(period));
    }
  }

  const allProgresses = await VideoWatchProgress.find({
    studentId: new mongoose.Types.ObjectId(studentId),
    $or: items.map((i) => ({
      lessonDayId: new mongoose.Types.ObjectId(i.lessonDayId),
      periodId: new mongoose.Types.ObjectId(i.periodId),
    })),
  })
    .lean()
    .exec();

  const progressByPeriod = new Map<string, ProgressLite[]>();
  for (const p of allProgresses) {
    const key = `${p.lessonDayId.toString()}-${p.periodId.toString()}`;
    const list = progressByPeriod.get(key) ?? [];
    list.push(p);
    progressByPeriod.set(key, list);
  }

  return items
    .map((i) => {
      const key = `${i.lessonDayId}-${i.periodId}`;
      const totals = aggregatePeriodWatch(periodVideos.get(key) ?? [], progressByPeriod.get(key) ?? []);
      return { ...i, maxPercent: totals.totalPercent };
    })
    .filter((i) => i.maxPercent < COMPLETE_PERCENT)
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.period - b.period;
    });
}

export async function getClassWatchStats(classId: string, teacherId?: string) {
  if (!mongoose.Types.ObjectId.isValid(classId)) return [];
  const cid = new mongoose.Types.ObjectId(classId);
  const classDoc = await Class.findById(cid).select('studentIds').lean().exec();
  if (!classDoc) return [];

  const students = await Student.find({ _id: { $in: classDoc.studentIds ?? [] } })
    .select('name')
    .lean()
    .exec();
  const nameById = new Map(students.map((s) => [s._id.toString(), s.name]));

  const days = await LessonDay.find({ classId: cid }).sort({ date: -1 }).lean().exec();
  const rows: {
    studentId: string;
    studentName: string;
    lessonDayId: string;
    periodId: string;
    date: string;
    period: number;
    attendance: string;
    watchedSec: number;
    playTimeSec: number;
    maxPercent: number;
    hasVideo: boolean;
    videoCount: number;
  }[] = [];

  for (const day of days) {
    const periods = (day.periods || []) as (IPeriod & { _id?: mongoose.Types.ObjectId })[];
    periods.forEach((period, idx) => {
      if (teacherId && period.teacherId?.toString() !== teacherId) return;
      const reviewVideos = getReviewVideos(period);
      if (reviewVideos.length === 0 || !period._id) return;
      const date = day.date instanceof Date ? day.date.toISOString().slice(0, 10) : String(day.date).slice(0, 10);
      for (const rec of period.records || []) {
        const sid = rec.studentId?.toString();
        if (!sid) continue;
        rows.push({
          studentId: sid,
          studentName: nameById.get(sid) ?? '-',
          lessonDayId: day._id.toString(),
          periodId: period._id.toString(),
          date,
          period: idx + 1,
          attendance: rec.attendance ?? '',
          watchedSec: 0,
          playTimeSec: 0,
          maxPercent: 0,
          hasVideo: true,
          videoCount: reviewVideos.length,
        });
      }
    });
  }

  if (rows.length === 0) return [];

  const periodVideos = new Map<string, IReviewVideo[]>();
  for (const day of days) {
    const periods = (day.periods || []) as (IPeriod & { _id?: mongoose.Types.ObjectId })[];
    for (const period of periods) {
      if (!period._id) continue;
      periodVideos.set(`${day._id.toString()}-${period._id.toString()}`, getReviewVideos(period));
    }
  }

  const progresses = await VideoWatchProgress.find({
    lessonDayId: { $in: days.map((d) => d._id) },
  })
    .lean()
    .exec();

  const pMap = new Map<string, ProgressLite[]>();
  for (const p of progresses) {
    const key = `${p.studentId.toString()}-${p.lessonDayId.toString()}-${p.periodId.toString()}`;
    const list = pMap.get(key) ?? [];
    list.push(p);
    pMap.set(key, list);
  }

  return rows.map((r) => {
    const videos = periodVideos.get(`${r.lessonDayId}-${r.periodId}`) ?? [];
    const totals = aggregatePeriodWatch(videos, pMap.get(`${r.studentId}-${r.lessonDayId}-${r.periodId}`) ?? []);
    return {
      ...r,
      watchedSec: totals.watchedSec,
      playTimeSec: totals.playTimeSec,
      maxPercent: totals.totalPercent,
    };
  });
}
