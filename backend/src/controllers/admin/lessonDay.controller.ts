import { Request, Response } from 'express';
import * as lessonDayService from '../../services/admin/lessonDay.service';
import {
  canAccessClass,
  getAssignedClassIds,
  getTeacherIdByUserId,
} from '../../services/teacher/teacherClass.service';
import {
  assertPeriodOwnedByTeacher,
  sanitizeLessonDayDocForTeacher,
  sortPeriods,
} from '../../services/admin/lessonDay.utils';
import type { IPeriod } from '../../models/LessonDay.model';
import { ApiResponse } from '../../types/api';

function userOf(req: Request): { id: string; role: string } {
  return { id: req.user?.id ?? '', role: req.user?.role ?? '' };
}

async function denyClass(req: Request, res: Response<ApiResponse>, classId: string | null): Promise<boolean> {
  if (!classId) {
    res.status(404).json({ success: false, message: '수업을 찾을 수 없습니다.' });
    return true;
  }
  const { id, role } = userOf(req);
  const ok = await canAccessClass(classId, id, role);
  if (!ok) {
    res.status(403).json({ success: false, message: '이 반에 대한 권한이 없습니다.' });
    return true;
  }
  return false;
}

async function denyLessonDay(req: Request, res: Response<ApiResponse>, lessonDayId: string): Promise<boolean> {
  const classId = await lessonDayService.getLessonDayClassId(lessonDayId);
  return denyClass(req, res, classId);
}

function serializeLessonDay(doc: unknown, role: string, myTeacherId: string | null) {
  const raw =
    doc && typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
      ? (doc as { toObject: () => Record<string, unknown> }).toObject()
      : { ...(doc as object) };
  if (role === 'teacher' && myTeacherId) {
    return sanitizeLessonDayDocForTeacher(raw, myTeacherId);
  }
  return raw;
}

async function getMyTeacherId(req: Request): Promise<string | null> {
  const { id, role } = userOf(req);
  if (role !== 'teacher') return null;
  const tid = await getTeacherIdByUserId(id);
  return tid ? tid.toString() : null;
}

async function sortedPeriodAt(lessonDayId: string, periodIndex: number): Promise<IPeriod | null> {
  const doc = await lessonDayService.getLessonDayById(lessonDayId);
  if (!doc || periodIndex < 0 || periodIndex >= doc.periods.length) return null;
  return sortPeriods(doc.periods as IPeriod[])[periodIndex] ?? null;
}

export async function createLessonDay(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { classId, date } = req.body;
    if (!classId || !date) {
      res.status(400).json({ success: false, message: 'classId와 date는 필수입니다.' });
      return;
    }
    if (await denyClass(req, res, classId)) return;
    const doc = await lessonDayService.createLessonDay(classId, date);
    if (!doc) {
      res.status(400).json({ success: false, message: '해당 날짜·반의 수업이 이미 있거나 반 정보를 찾을 수 없습니다.' });
      return;
    }
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 생성에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listLessonDays(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const classId = req.query.classId as string | undefined;
    const teacherId = req.query.teacherId as string | undefined;
    const { id, role } = userOf(req);

    if (classId) {
      if (await denyClass(req, res, classId)) return;
      const list = await lessonDayService.listLessonDays({ dateFrom, dateTo, classId, teacherId });
      res.status(200).json({ success: true, data: list });
      return;
    }

    const assigned = await getAssignedClassIds(id, role);
    if (assigned && assigned.length === 0) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const list = await lessonDayService.listLessonDays({
      dateFrom,
      dateTo,
      teacherId,
      classIds: assigned ?? undefined,
    });
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getLessonDayByClassAndDate(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const classId = req.query.classId as string | undefined;
    const date = req.query.date as string | undefined;
    if (!classId || !date) {
      res.status(400).json({ success: false, message: 'classId와 date가 필요합니다.' });
      return;
    }
    if (await denyClass(req, res, classId)) return;
    const doc = await lessonDayService.getLessonDayByClassAndDate(classId, date);
    if (!doc) {
      res.status(200).json({ success: true, data: null });
      return;
    }
    const { role } = userOf(req);
    const myTeacherId = await getMyTeacherId(req);
    res.status(200).json({ success: true, data: serializeLessonDay(doc, role, myTeacherId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getLessonDay(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (await denyLessonDay(req, res, req.params.id)) return;
    const doc = await lessonDayService.getLessonDayById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, message: '수업을 찾을 수 없습니다.' });
      return;
    }
    const { role } = userOf(req);
    const myTeacherId = await getMyTeacherId(req);
    res.status(200).json({ success: true, data: serializeLessonDay(doc, role, myTeacherId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updateLessonDay(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (await denyLessonDay(req, res, req.params.id)) return;
    const { date, classId } = req.body;
    if (classId && (await denyClass(req, res, classId))) return;
    const doc = await lessonDayService.updateLessonDay(req.params.id, { date, classId });
    if (!doc) {
      res.status(404).json({ success: false, message: '수업을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function deleteLessonDay(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (await denyLessonDay(req, res, req.params.id)) return;
    const deleted = await lessonDayService.deleteLessonDay(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: '수업을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, message: '삭제되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function addPeriod(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (await denyLessonDay(req, res, req.params.id)) return;
    const { role, id: userId } = userOf(req);
    let teacherId = req.body.teacherId as string | undefined;
    let periodNumber = req.body.periodNumber != null ? Number(req.body.periodNumber) : undefined;

    if (role === 'teacher') {
      const myTeacherId = await getTeacherIdByUserId(userId);
      if (!myTeacherId) {
        res.status(403).json({ success: false, message: '강사 정보를 찾을 수 없습니다.' });
        return;
      }
      teacherId = myTeacherId.toString();
      if (periodNumber == null || Number.isNaN(periodNumber) || periodNumber < 1) {
        res.status(400).json({ success: false, message: 'periodNumber(교시 번호)는 필수입니다.' });
        return;
      }
    } else if (!teacherId) {
      res.status(400).json({ success: false, message: 'teacherId는 필수입니다.' });
      return;
    }

    const result = await lessonDayService.addPeriod(req.params.id, teacherId, periodNumber);
    if (result && 'error' in result) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }
    if (!result) {
      res.status(404).json({ success: false, message: '수업을 찾을 수 없습니다.' });
      return;
    }
    const myTeacherId = await getMyTeacherId(req);
    res.status(200).json({ success: true, data: serializeLessonDay(result, role, myTeacherId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '교시 추가에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function removePeriod(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (await denyLessonDay(req, res, req.params.id)) return;
    const periodIndex = Number(req.query.periodIndex ?? req.body?.periodIndex);
    if (Number.isNaN(periodIndex) || periodIndex < 0) {
      res.status(400).json({ success: false, message: '유효한 periodIndex가 필요합니다.' });
      return;
    }
    const { role } = userOf(req);
    const doc = await lessonDayService.removePeriod(req.params.id, periodIndex);
    if (!doc) {
      res.status(404).json({ success: false, message: '수업 또는 교시를 찾을 수 없습니다.' });
      return;
    }
    const myTeacherId = await getMyTeacherId(req);
    res.status(200).json({ success: true, data: serializeLessonDay(doc, role, myTeacherId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '교시 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updatePeriod(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (await denyLessonDay(req, res, req.params.id)) return;
    const periodIndex = Number(req.body.periodIndex);
    if (Number.isNaN(periodIndex) || periodIndex < 0) {
      res.status(400).json({ success: false, message: '유효한 periodIndex가 필요합니다.' });
      return;
    }
    const { role, id: userId } = userOf(req);
    const period = await sortedPeriodAt(req.params.id, periodIndex);
    if (!period) {
      res.status(404).json({ success: false, message: '교시를 찾을 수 없습니다.' });
      return;
    }

    let { teacherId, memo, homeworkDescription, homeworkDueDate, reviewVideoUrl, reviewVideos, records } = req.body;
    const periodNumber = req.body.periodNumber != null ? Number(req.body.periodNumber) : undefined;

    if (role === 'teacher') {
      teacherId = undefined;
      reviewVideos = undefined;
      reviewVideoUrl = undefined;
    }

    const doc = await lessonDayService.updatePeriod(req.params.id, periodIndex, {
      teacherId,
      periodNumber: periodNumber != null && !Number.isNaN(periodNumber) ? periodNumber : undefined,
      memo,
      homeworkDescription,
      homeworkDueDate,
      reviewVideos: reviewVideos ?? undefined,
      reviewVideoUrl: reviewVideos ? undefined : reviewVideoUrl,
      records,
    }, userId);
    if (!doc) {
      res.status(404).json({ success: false, message: '수업 또는 교시를 찾을 수 없습니다.' });
      return;
    }
    const myTeacherId = await getMyTeacherId(req);
    res.status(200).json({ success: true, data: serializeLessonDay(doc, role, myTeacherId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '교시 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function movePeriod(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (await denyLessonDay(req, res, req.params.id)) return;
    const periodIndex = Number(req.body.periodIndex);
    const newPeriodNumber = Number(req.body.periodNumber);
    if (Number.isNaN(periodIndex) || periodIndex < 0 || Number.isNaN(newPeriodNumber) || newPeriodNumber < 1) {
      res.status(400).json({ success: false, message: 'periodIndex와 periodNumber가 필요합니다.' });
      return;
    }
    const { role } = userOf(req);
    const result = await lessonDayService.movePeriodNumber(req.params.id, periodIndex, newPeriodNumber);
    if (result && 'error' in result) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }
    if (!result) {
      res.status(404).json({ success: false, message: '수업 또는 교시를 찾을 수 없습니다.' });
      return;
    }
    const myTeacherId = await getMyTeacherId(req);
    res.status(200).json({ success: true, data: serializeLessonDay(result, role, myTeacherId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '교시 이동에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updatePeriodReviewVideos(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (await denyLessonDay(req, res, req.params.id)) return;
    const periodIndex = Number(req.body.periodIndex);
    if (Number.isNaN(periodIndex) || periodIndex < 0) {
      res.status(400).json({ success: false, message: '유효한 periodIndex가 필요합니다.' });
      return;
    }
    const { role, id: userId } = userOf(req);
    const period = await sortedPeriodAt(req.params.id, periodIndex);
    if (!period) {
      res.status(404).json({ success: false, message: '교시를 찾을 수 없습니다.' });
      return;
    }
    if (role === 'teacher') {
      const myTeacherId = await getTeacherIdByUserId(userId);
      if (!myTeacherId || !assertPeriodOwnedByTeacher(period, myTeacherId)) {
        res.status(403).json({ success: false, message: '본인 교시의 복습 영상만 수정할 수 있습니다.' });
        return;
      }
    }
    const { reviewVideos } = req.body;
    const doc = await lessonDayService.updatePeriod(req.params.id, periodIndex, {
      reviewVideos: reviewVideos ?? [],
    }, userId);
    if (!doc) {
      res.status(404).json({ success: false, message: '수업 또는 교시를 찾을 수 없습니다.' });
      return;
    }
    const myTeacherId = await getMyTeacherId(req);
    res.status(200).json({ success: true, data: serializeLessonDay(doc, role, myTeacherId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '복습 영상 저장에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
