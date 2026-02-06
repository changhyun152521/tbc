import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as authService from '../services/auth.service';
import { ApiResponse } from '../types/api';

export async function findLoginId(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const { type, name, phone } = req.body;
    const loginId = await authService.findLoginId(type, name, phone);
    if (!loginId) {
      res.status(404).json({ success: false, message: '일치하는 정보가 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: { loginId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '아이디 찾기에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function login(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const { loginId, password } = req.body;
    const result = await authService.login(loginId, password);
    if (!result) {
      res.status(401).json({ success: false, message: '로그인 ID 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
