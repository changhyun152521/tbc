import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as questionVideoService from '../../services/admin/questionVideo.service';
import { ApiResponse } from '../../types/api';

export async function listQuestionVideos(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const result = await questionVideoService.listForStudent(
      req.params.id,
      req.user?.id ?? '',
      req.user?.role ?? ''
    );
    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }
    res.status(200).json({ success: true, data: result.items });
  } catch (err) {
    const message = err instanceof Error ? err.message : '질문 영상 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function createQuestionVideo(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const result = await questionVideoService.createForStudent(
      req.params.id,
      req.user?.id ?? '',
      req.user?.role ?? '',
      { url: req.body.url, title: req.body.title }
    );
    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }
    res.status(201).json({ success: true, data: result.item });
  } catch (err) {
    const message = err instanceof Error ? err.message : '질문 영상 등록에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function deleteQuestionVideo(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const result = await questionVideoService.deleteForStudent(
      req.params.id,
      req.params.videoId,
      req.user?.id ?? '',
      req.user?.role ?? ''
    );
    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }
    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '질문 영상 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
