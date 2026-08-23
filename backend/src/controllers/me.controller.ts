import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as meService from '../services/me.service';
import * as notificationService from '../services/notification.service';
import { ApiResponse } from '../types/api';

export async function getMe(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const profile = await meService.getMe(req.user.id);
    if (!profile) {
      res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
      return;
    }
    if (req.user.preview) profile.isPreview = true;
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : '내정보 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updatePassword(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (req.user?.preview) {
      res.status(403).json({ success: false, message: '미리보기 모드에서는 변경할 수 없습니다.' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    const result = await meService.updatePassword(req.user.id, currentPassword, newPassword);
    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({ success: true, message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function completeInitialCredentials(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (req.user?.preview) {
      res.status(403).json({ success: false, message: '미리보기 모드에서는 변경할 수 없습니다.' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const result = await meService.completeInitialCredentials(req.user.id, {
      currentPassword: String(req.body.currentPassword ?? ''),
      newPassword: String(req.body.newPassword ?? ''),
      newLoginId: String(req.body.newLoginId ?? ''),
    });
    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({
      success: true,
      message: '아이디와 비밀번호가 변경되었습니다.',
      data: { loginId: result.loginId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '계정 설정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updateLoginId(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (req.user?.preview) {
      res.status(403).json({ success: false, message: '미리보기 모드에서는 변경할 수 없습니다.' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const { newLoginId } = req.body;
    const result = await meService.updateLoginId(req.user.id, newLoginId);
    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({ success: true, message: '로그인 ID가 변경되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '로그인 ID 변경에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updatePhone(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (req.user?.preview) {
      res.status(403).json({ success: false, message: '미리보기 모드에서는 변경할 수 없습니다.' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const { newPhone } = req.body;
    const result = await meService.updatePhone(req.user.id, newPhone);
    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({ success: true, message: '전화번호가 변경되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '전화번호 변경에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listNotifications(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const limit = Number(req.query.limit ?? 20);
    const page = Number(req.query.page ?? 1);
    const rawTypes = typeof req.query.types === 'string' ? req.query.types : '';
    const types = rawTypes
      .split(',')
      .map((v) => v.trim())
      .filter((v): v is 'lesson_update' | 'test_created' | 'student_reply' | 'parent_reply' | 'reply_like' | 'announcement_created' =>
        ['lesson_update', 'test_created', 'student_reply', 'parent_reply', 'reply_like', 'announcement_created'].includes(v)
      );
    const data = await notificationService.listNotificationsForUser(req.user.id, {
      limit,
      page,
      types: types.length > 0 ? types : undefined,
      role: req.user.role,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알림 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getUnreadNotificationCount(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const count = await notificationService.getUnreadCount(req.user.id, req.user.role);
    res.status(200).json({ success: true, data: { count } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '미확인 알림 수 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function markNotificationRead(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const ok = await notificationService.markNotificationRead(req.user.id, req.params.id);
    if (!ok) {
      res.status(404).json({ success: false, message: '알림을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알림 읽음 처리에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const count = await notificationService.markAllNotificationsRead(req.user.id);
    res.status(200).json({ success: true, data: { count } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '전체 읽음 처리에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listReplyInbox(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 5);
    const data = await notificationService.listReplyInboxForUser(req.user.id, req.user.role, { page, limit });
    res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '답글 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function toggleReplyLike(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    const result = await notificationService.toggleReplyLike({
      actorUserId: req.user.id,
      lessonDayId: req.body.lessonDayId,
      periodId: req.body.periodId,
      studentId: req.body.studentId,
      channel: req.body.channel,
    });
    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message ?? '좋아요 처리에 실패했습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '좋아요 처리에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
