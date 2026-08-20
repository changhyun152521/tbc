import mongoose from 'mongoose';
import type { IPeriod } from '../../models/LessonDay.model';

export function periodTeacherIdStr(period: { teacherId?: unknown }): string {
  const t = period.teacherId;
  if (t && typeof t === 'object' && '_id' in (t as object)) {
    return String((t as { _id: unknown })._id);
  }
  return String(t ?? '');
}

export function teacherDisplayName(period: { teacherId?: unknown }): string {
  const t = period.teacherId;
  if (t && typeof t === 'object' && 'name' in (t as object)) {
    return String((t as { name?: string }).name ?? '');
  }
  return '';
}

/** periodNumber 기준 정렬 (없으면 0 취급) */
export function sortPeriods<T extends IPeriod>(periods: T[]): T[] {
  return [...periods].sort((a, b) => (a.periodNumber ?? 0) - (b.periodNumber ?? 0));
}

export function nextPeriodNumber(periods: IPeriod[]): number {
  if (periods.length === 0) return 1;
  const nums = periods.map((p) => p.periodNumber ?? 0);
  return Math.max(...nums, periods.length) + 1;
}

export function periodNumberTaken(periods: IPeriod[], periodNumber: number, excludeIndex?: number): boolean {
  const sorted = sortPeriods(periods);
  return sorted.some((p, idx) => {
    if (excludeIndex != null && idx === excludeIndex) return false;
    return (p.periodNumber ?? 0) === periodNumber;
  });
}

/** 강사 조회: 타인 교시의 reviewVideos·레거시 영상 필드 제거 */
export function sanitizeLessonDayDocForTeacher(
  doc: Record<string, unknown>,
  myTeacherId: string
): Record<string, unknown> {
  const periods = (doc.periods as IPeriod[]) ?? [];
  const sorted = sortPeriods(periods);
  const sanitized = sorted.map((p) => {
    const plain =
      typeof (p as unknown as { toObject?: () => Record<string, unknown> }).toObject === 'function'
        ? (p as unknown as { toObject: () => Record<string, unknown> }).toObject()
        : { ...(p as object) };
    const isMine = periodTeacherIdStr(p) === myTeacherId;
    plain.isMine = isMine;
    plain.canEditReviewVideos = isMine;
    if (!isMine) {
      delete plain.reviewVideos;
      delete plain.reviewVideoUrl;
      delete plain.reviewVideoId;
    }
    return plain;
  });
  return { ...doc, periods: sanitized };
}

export function assertPeriodOwnedByTeacher(
  period: IPeriod | undefined,
  teacherId: mongoose.Types.ObjectId | string
): boolean {
  if (!period) return false;
  return periodTeacherIdStr(period) === teacherId.toString();
}
