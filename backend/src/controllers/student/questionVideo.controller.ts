import { Request, Response } from 'express';
import * as studentDataService from '../../services/student/studentData.service';
import * as questionVideoService from '../../services/student/questionVideo.service';
import { ApiResponse } from '../../types/api';

function getUserId(req: Request): string {
  return req.user?.id ?? '';
}

async function requireStudentId(req: Request, res: Response<ApiResponse>): Promise<string | null> {
  const info = await studentDataService.getStudentIdAndAccessType(getUserId(req));
  if (!info) {
    res.status(404).json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
    return null;
  }
  return info.studentId;
}

async function requireRealStudent(req: Request, res: Response<ApiResponse>): Promise<string | null> {
  if (req.user?.preview) {
    res.status(403).json({
      success: false,
      message: '미리보기 모드에서는 질문 영상을 시청할 수 없습니다. 학생 본인 계정으로 로그인해 주세요.',
    });
    return null;
  }
  const info = await studentDataService.getStudentIdAndAccessType(getUserId(req));
  if (!info) {
    res.status(404).json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
    return null;
  }
  if (info.isAdminAccess) {
    res.status(403).json({ success: false, message: '관리 접속 계정은 질문 영상을 볼 수 없습니다.' });
    return null;
  }
  return info.studentId;
}

export async function listQuestionVideos(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const studentId = await requireStudentId(req, res);
    if (!studentId) return;
    const items = await questionVideoService.listForStudent(studentId);
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : '질문 영상 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listPendingQuestionVideos(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const studentId = await requireStudentId(req, res);
    if (!studentId) return;
    const items = await questionVideoService.listPendingForStudent(studentId);
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : '미시청 질문 영상 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getQuestionVideo(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const studentId = await requireRealStudent(req, res);
    if (!studentId) return;
    const result = await questionVideoService.getOneForStudent(studentId, req.params.id);
    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '질문 영상 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function putProgress(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const studentId = await requireRealStudent(req, res);
    if (!studentId) return;
    const { videoId, youtubeVideoId, currentTime, watchedSec, playTimeSec, durationSec } = req.body ?? {};
    if (!videoId || !youtubeVideoId) {
      res.status(400).json({ success: false, message: 'videoId, youtubeVideoId가 필요합니다.' });
      return;
    }
    const result = await questionVideoService.upsertProgress({
      studentId,
      videoDocId: String(videoId),
      youtubeVideoId: String(youtubeVideoId),
      currentTime: Number(currentTime),
      watchedSec: Number(watchedSec),
      playTimeSec: Number(playTimeSec),
      durationSec: Number(durationSec),
    });
    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '시청 기록 저장에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
