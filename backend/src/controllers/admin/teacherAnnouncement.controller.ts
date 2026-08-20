import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as teacherAnnouncementService from '../../services/admin/teacherAnnouncement.service';
import { kstToday } from '../../utils/dateKst';
import { ApiResponse } from '../../types/api';

export async function list(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const list = await teacherAnnouncementService.listAll();
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 공지 목록 조회에 실패했습니다.';
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
    const body = req.body;
    const result = await teacherAnnouncementService.createAnnouncement(
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
    const message = err instanceof Error ? err.message : '강사 공지 등록에 실패했습니다.';
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
    const body = req.body;
    const result = await teacherAnnouncementService.updateAnnouncement(req.params.id, {
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
    const message = err instanceof Error ? err.message : '강사 공지 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function remove(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const ok = await teacherAnnouncementService.deleteAnnouncement(req.params.id);
    if (!ok) {
      res.status(404).json({ success: false, message: '공지를 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, message: '삭제되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 공지 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listActiveForTeacher(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const userId = req.user?.id ?? '';
    const list = await teacherAnnouncementService.getActiveForTeacher(userId);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 공지 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function dismiss(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const userId = req.user?.id ?? '';
    const hideUntil = typeof req.body.hideUntil === 'string' ? req.body.hideUntil : kstToday();
    const result = await teacherAnnouncementService.dismissAnnouncement(
      userId,
      req.params.id,
      hideUntil
    );
    if ('error' in result && result.error) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 공지 숨기기에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
