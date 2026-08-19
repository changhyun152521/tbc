import { Request, Response } from 'express';
import * as lessonDayService from '../../services/admin/lessonDay.service';
import { canAccessClass, getAssignedClassIds } from '../../services/teacher/teacherClass.service';
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

/** 반 ID + 날짜로 해당 날짜 수업일 조회 (수업관리 교실 페이지용) */
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
    res.status(200).json({ success: true, data: doc });
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
    res.status(200).json({ success: true, data: doc });
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
    const teacherId = req.body.teacherId;
    if (!teacherId) {
      res.status(400).json({ success: false, message: 'teacherId는 필수입니다.' });
      return;
    }
    const doc = await lessonDayService.addPeriod(req.params.id, teacherId);
    if (!doc) {
      res.status(404).json({ success: false, message: '수업을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: doc });
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
    const doc = await lessonDayService.removePeriod(req.params.id, periodIndex);
    if (!doc) {
      res.status(404).json({ success: false, message: '수업 또는 교시를 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: doc });
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
    const { teacherId, memo, homeworkDescription, homeworkDueDate, reviewVideoUrl, reviewVideos, records } = req.body;
    const doc = await lessonDayService.updatePeriod(req.params.id, periodIndex, {
      teacherId,
      memo,
      homeworkDescription,
      homeworkDueDate,
      reviewVideos: reviewVideos ?? undefined,
      reviewVideoUrl: reviewVideos ? undefined : reviewVideoUrl,
      records,
    });
    if (!doc) {
      res.status(404).json({ success: false, message: '수업 또는 교시를 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '교시 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
