import mongoose from 'mongoose';
import { Class } from '../../models/Class.model';
import { LessonDay } from '../../models/LessonDay.model';
import type { IPeriod, IStudentRecord } from '../../models/LessonDay.model';
import { Student } from '../../models/Student.model';
import { VideoWatchProgress } from '../../models/VideoWatchProgress.model';
import { getTeacherIdByUserId } from './teacherClass.service';

const COMPLETE_PERCENT = 90;
const REVIEW_LOOKBACK_DAYS = 14;
const PERIOD_LOOKBACK_DAYS = 7;

function dateStr(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function periodIdOf(period: IPeriod & { _id?: mongoose.Types.ObjectId }): string {
  return period._id ? period._id.toString() : '';
}

export async function getTeacherDashboard(userId: string) {
  const teacherId = await getTeacherIdByUserId(userId);
  if (!teacherId) {
    return { classCount: 0, studentCount: 0, incompleteReviewVideos: [], recentPeriods: [] };
  }

  const classes = await Class.find({ teacherIds: teacherId }).select('_id name studentIds').lean().exec();
  const classIds = classes.map((c) => c._id as mongoose.Types.ObjectId);
  const classNameById = new Map(classes.map((c) => [c._id.toString(), c.name]));
  const studentCount = classes.reduce((sum, c) => sum + ((c.studentIds as mongoose.Types.ObjectId[])?.length ?? 0), 0);

  const periodFrom = new Date();
  periodFrom.setDate(periodFrom.getDate() - PERIOD_LOOKBACK_DAYS);
  periodFrom.setHours(0, 0, 0, 0);

  const recentDays = await LessonDay.find({
    classId: { $in: classIds },
    date: { $gte: periodFrom },
  })
    .sort({ date: -1 })
    .lean()
    .exec();

  const recentPeriods: {
    classId: string;
    className: string;
    lessonDayId: string;
    periodId: string;
    date: string;
    period: number;
  }[] = [];

  for (const day of recentDays) {
    const periods = (day.periods || []) as (IPeriod & { _id?: mongoose.Types.ObjectId })[];
    periods.forEach((period, idx) => {
      if (period.teacherId?.toString() !== teacherId.toString()) return;
      const pid = periodIdOf(period);
      if (!pid) return;
      recentPeriods.push({
        classId: day.classId.toString(),
        className: classNameById.get(day.classId.toString()) ?? '',
        lessonDayId: day._id.toString(),
        periodId: pid,
        date: dateStr(day.date),
        period: idx + 1,
      });
    });
  }

  recentPeriods.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.period - a.period;
  });

  const reviewFrom = new Date();
  reviewFrom.setDate(reviewFrom.getDate() - REVIEW_LOOKBACK_DAYS);
  reviewFrom.setHours(0, 0, 0, 0);

  const reviewDays = await LessonDay.find({
    classId: { $in: classIds },
    date: { $gte: reviewFrom },
  })
    .sort({ date: -1 })
    .lean()
    .exec();

  const incompleteCandidates: {
    studentId: string;
    className: string;
    lessonDayId: string;
    periodId: string;
    date: string;
    period: number;
  }[] = [];

  for (const day of reviewDays) {
    const periods = (day.periods || []) as (IPeriod & { _id?: mongoose.Types.ObjectId })[];
    periods.forEach((period, idx) => {
      if (period.teacherId?.toString() !== teacherId.toString()) return;
      const videoId = (period.reviewVideoId ?? '').trim();
      if (!videoId) return;
      const pid = periodIdOf(period);
      if (!pid) return;
      for (const rec of period.records || []) {
        if ((rec as IStudentRecord).attendance !== 'X') continue;
        const sid = rec.studentId?.toString();
        if (!sid) continue;
        incompleteCandidates.push({
          studentId: sid,
          className: classNameById.get(day.classId.toString()) ?? '',
          lessonDayId: day._id.toString(),
          periodId: pid,
          date: dateStr(day.date),
          period: idx + 1,
        });
      }
    });
  }

  let incompleteReviewVideos: {
    studentId: string;
    studentName: string;
    className: string;
    lessonDayId: string;
    periodId: string;
    date: string;
    period: number;
    maxPercent: number;
  }[] = [];

  if (incompleteCandidates.length > 0) {
    const studentIds = [...new Set(incompleteCandidates.map((c) => c.studentId))];
    const students = await Student.find({ _id: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) } })
      .select('name')
      .lean()
      .exec();
    const nameById = new Map(students.map((s) => [s._id.toString(), s.name]));

    const progresses = await VideoWatchProgress.find({
      $or: incompleteCandidates.map((c) => ({
        studentId: new mongoose.Types.ObjectId(c.studentId),
        lessonDayId: new mongoose.Types.ObjectId(c.lessonDayId),
        periodId: new mongoose.Types.ObjectId(c.periodId),
      })),
    })
      .lean()
      .exec();

    const percentMap = new Map(
      progresses.map((p) => [
        `${p.studentId.toString()}-${p.lessonDayId.toString()}-${p.periodId.toString()}`,
        p.maxPercent,
      ])
    );

    incompleteReviewVideos = incompleteCandidates
      .map((c) => ({
        ...c,
        studentName: nameById.get(c.studentId) ?? '-',
        maxPercent: percentMap.get(`${c.studentId}-${c.lessonDayId}-${c.periodId}`) ?? 0,
      }))
      .filter((c) => c.maxPercent < COMPLETE_PERCENT)
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.period - a.period;
      });
  }

  return {
    classCount: classes.length,
    studentCount,
    incompleteReviewVideos,
    recentPeriods,
  };
}
