import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as meService from '../services/me.service';
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
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : '내정보 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updatePassword(req: Request, res: Response<ApiResponse>): Promise<void> {
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

export async function updateLoginId(req: Request, res: Response<ApiResponse>): Promise<void> {
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
