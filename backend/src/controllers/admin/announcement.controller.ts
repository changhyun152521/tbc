import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as announcementService from '../../services/admin/announcement.service';
import { canAccessClass } from '../../services/teacher/teacherClass.service';
import * as studentDataService from '../../services/student/studentData.service';
import { kstToday } from '../../utils/dateKst';
import { ApiResponse } from '../../types/api';

function getUser(req: Request): { id: string; role: string } {
  return { id: req.user?.id ?? '', role: req.user?.role ?? '' };
}

async function denyIfNoClassAccess(req: Request, res: Response<ApiResponse>, classId: string): Promise<boolean> {
  const { id, role } = getUser(req);
  const ok = await canAccessClass(classId, id, role);
  if (!ok) {
    res.status(403).json({ success: false, message: '이 반에 대한 권한이 없습니다.' });
    return true;
  }
  return false;
}

export async function listByClass(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const classId = req.params.classId;
    if (await denyIfNoClassAccess(req, res, classId)) return;
    const list = await announcementService.listByClass(classId);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '공지 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function create(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const classId = req.params.classId;
    if (await denyIfNoClassAccess(req, res, classId)) return;
    const body = req.body;
    const result = await announcementService.createAnnouncement(
      classId,
      {
        title: body.title,
        body: body.body ?? '',
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        isActive: body.isActive,
      },
      req.user?.id
    );
    if ('error' in result && result.error) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }
    res.status(201).json({ success: true, data: 'data' in result ? result.data : result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '공지 등록에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function update(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const classId = await announcementService.getAnnouncementClassId(req.params.id);
    if (!classId) {
      res.status(404).json({ success: false, message: '공지를 찾을 수 없습니다.' });
      return;
    }
    if (await denyIfNoClassAccess(req, res, classId)) return;
    const body = req.body;
    const result = await announcementService.updateAnnouncement(req.params.id, {
      title: body.title,
      body: body.body,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      isActive: body.isActive,
    });
    if ('error' in result && result.error) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }
    res.status(200).json({ success: true, data: 'data' in result ? result.data : result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '공지 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function remove(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const classId = await announcementService.getAnnouncementClassId(req.params.id);
    if (!classId) {
      res.status(404).json({ success: false, message: '공지를 찾을 수 없습니다.' });
      return;
    }
    if (await denyIfNoClassAccess(req, res, classId)) return;
    const ok = await announcementService.deleteAnnouncement(req.params.id);
    if (!ok) {
      res.status(404).json({ success: false, message: '공지를 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, message: '삭제되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '공지 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listActiveForMe(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const userId = req.user?.id ?? '';
    const info = await studentDataService.getStudentIdAndAccessType(userId);
    if (!info) {
      res.status(404).json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
      return;
    }
    const classes = await studentDataService.getStudentClasses(info.studentId);
    const list = await announcementService.getActiveForStudent(
      classes.map((c) => c._id),
      userId
    );
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '공지 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function dismiss(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const userId = req.user?.id ?? '';
    const hideUntil = typeof req.body.hideUntil === 'string' ? req.body.hideUntil : kstToday();
    const result = await announcementService.dismissAnnouncement(userId, req.params.id, hideUntil);
    if ('error' in result && result.error) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '공지 숨기기에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
