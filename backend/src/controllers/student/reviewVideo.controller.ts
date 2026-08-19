import { Request, Response } from 'express';
import * as reviewVideoService from '../../services/student/reviewVideo.service';
import * as studentDataService from '../../services/student/studentData.service';
import { canAccessClass, getTeacherIdByUserId } from '../../services/teacher/teacherClass.service';
import { ApiResponse } from '../../types/api';

function getUserId(req: Request): string {
  return req.user?.id ?? '';
}

async function requireRealStudent(req: Request, res: Response<ApiResponse>): Promise<string | null> {
  const info = await studentDataService.getStudentIdAndAccessType(getUserId(req));
  if (!info) {
    res.status(404).json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
    return null;
  }
  if (info.isAdminAccess) {
    res.status(403).json({ success: false, message: '관리 접속 계정은 복습 영상을 볼 수 없습니다.' });
    return null;
  }
  return info.studentId;
}

export async function getReviewVideo(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const studentId = await requireRealStudent(req, res);
    if (!studentId) return;
    const result = await reviewVideoService.getReviewVideosForStudent(
      studentId,
      req.params.lessonDayId,
      req.params.periodId
    );
    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '복습 영상 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function putProgress(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const studentId = await requireRealStudent(req, res);
    if (!studentId) return;
    const { lessonDayId, periodId, videoIndex, youtubeVideoId, currentTime, watchedSec, playTimeSec, durationSec } = req.body ?? {};
    if (!lessonDayId || !periodId || !youtubeVideoId) {
      res.status(400).json({ success: false, message: 'lessonDayId, periodId, youtubeVideoId가 필요합니다.' });
      return;
    }
    const result = await reviewVideoService.upsertProgress({
      studentId,
      lessonDayId: String(lessonDayId),
      periodId: String(periodId),
      videoIndex: Number(videoIndex) || 0,
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

export async function listPending(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const studentId = await requireRealStudent(req, res);
    if (!studentId) return;
    const list = await reviewVideoService.listPendingForStudent(studentId);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '미시청 영상 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getClassWatchStats(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const classId = req.params.classId;
    const userId = req.user?.id ?? '';
    const role = req.user?.role ?? '';
    const allowed = await canAccessClass(classId, userId, role);
    if (!allowed) {
      res.status(403).json({ success: false, message: '이 반에 대한 권한이 없습니다.' });
      return;
    }
    const teacherId = role === 'teacher' ? await getTeacherIdByUserId(userId) : null;
    if (role === 'teacher' && !teacherId) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const list = await reviewVideoService.getClassWatchStats(
      classId,
      teacherId ? teacherId.toString() : undefined
    );
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '시청 현황 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
