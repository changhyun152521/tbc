import mongoose from 'mongoose';
import { LessonDay } from '../../models/LessonDay.model';
import type { IPeriod, IStudentRecord } from '../../models/LessonDay.model';
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

export async function getReviewVideoForStudent(
  studentId: string,
  lessonDayId: string,
  periodId: string
): Promise<{ youtubeVideoId: string; lessonDayId: string; periodId: string; date: string; period: number; lastPositionSec: number; maxPercent: number; playTimeSec: number; watchedSec: number } | { error: string; status: number }> {
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
  const videoId = (period.reviewVideoId ?? '').trim();
  if (!videoId) return { error: '등록된 복습 영상이 없습니다.', status: 404 };

  const progress = await VideoWatchProgress.findOne({
    studentId: new mongoose.Types.ObjectId(studentId),
    lessonDayId: new mongoose.Types.ObjectId(lessonDayId),
    periodId: new mongoose.Types.ObjectId(periodId),
  })
    .lean()
    .exec();

  const date = day.date instanceof Date ? day.date.toISOString().slice(0, 10) : String(day.date).slice(0, 10);
  return {
    youtubeVideoId: videoId,
    lessonDayId,
    periodId,
    date,
    period: idx + 1,
    lastPositionSec: progress?.lastPositionSec ?? 0,
    maxPercent: progress?.maxPercent ?? 0,
    playTimeSec: progress?.playTimeSec ?? 0,
    watchedSec: progress?.watchedSec ?? 0,
  };
}

export async function upsertProgress(input: {
  studentId: string;
  lessonDayId: string;
  periodId: string;
  currentTime: number;
  watchedSec: number;
  playTimeSec: number;
  durationSec: number;
}): Promise<{ maxPercent: number; watchedSec: number; playTimeSec: number; completed: boolean } | { error: string; status: number }> {
  const access = await getReviewVideoForStudent(input.studentId, input.lessonDayId, input.periodId);
  if ('error' in access) return access;

  const duration = Math.max(0, Number(input.durationSec) || 0);
  const currentTime = Math.max(0, Number(input.currentTime) || 0);
  let incomingWatched = Math.max(0, Number(input.watchedSec) || 0);
  let incomingPlayTime = Math.max(0, Number(input.playTimeSec) || 0);
  if (duration > 0) incomingWatched = Math.min(incomingWatched, duration + 1);

  const now = new Date();
  const existing = await VideoWatchProgress.findOne({
    studentId: new mongoose.Types.ObjectId(input.studentId),
    lessonDayId: new mongoose.Types.ObjectId(input.lessonDayId),
    periodId: new mongoose.Types.ObjectId(input.periodId),
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
    youtubeVideoId: access.youtubeVideoId,
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
    },
    { $set: update },
    { upsert: true, new: true }
  ).exec();

  return { maxPercent, watchedSec, playTimeSec, completed };
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
  }[] = [];

  for (const day of days) {
    const periods = (day.periods || []) as (IPeriod & {
      _id?: mongoose.Types.ObjectId;
      teacherId?: mongoose.Types.ObjectId | { name?: string };
    })[];
    periods.forEach((period, idx) => {
      const videoId = (period.reviewVideoId ?? '').trim();
      if (!videoId) return;
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
      });
    });
  }

  if (items.length === 0) return [];

  const progresses = await VideoWatchProgress.find({
    studentId: new mongoose.Types.ObjectId(studentId),
    $or: items.map((i) => ({
      lessonDayId: new mongoose.Types.ObjectId(i.lessonDayId),
      periodId: new mongoose.Types.ObjectId(i.periodId),
    })),
  })
    .lean()
    .exec();

  const percentMap = new Map(
    progresses.map((p) => [`${p.lessonDayId.toString()}-${p.periodId.toString()}`, p.maxPercent])
  );

  return items
    .map((i) => ({
      ...i,
      maxPercent: percentMap.get(`${i.lessonDayId}-${i.periodId}`) ?? 0,
    }))
    .filter((i) => i.maxPercent < COMPLETE_PERCENT)
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.period - b.period;
    });
}

export async function getClassWatchStats(classId: string) {
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
  }[] = [];

  for (const day of days) {
    const periods = (day.periods || []) as (IPeriod & { _id?: mongoose.Types.ObjectId })[];
    periods.forEach((period, idx) => {
      const videoId = (period.reviewVideoId ?? '').trim();
      if (!videoId || !period._id) return;
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
        });
      }
    });
  }

  if (rows.length === 0) return [];

  const progresses = await VideoWatchProgress.find({
    lessonDayId: { $in: days.map((d) => d._id) },
  })
    .lean()
    .exec();

  const pMap = new Map(
    progresses.map((p) => [
      `${p.studentId.toString()}-${p.lessonDayId.toString()}-${p.periodId.toString()}`,
      p,
    ])
  );

  return rows.map((r) => {
    const p = pMap.get(`${r.studentId}-${r.lessonDayId}-${r.periodId}`);
    return {
      ...r,
      watchedSec: p?.watchedSec ?? 0,
      playTimeSec: p?.playTimeSec ?? p?.watchedSec ?? 0,
      maxPercent: p?.maxPercent ?? 0,
    };
  });
}
