import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Student } from '../models/Student.model';
import * as studentDataService from '../services/student/studentData.service';
import { ApiResponse } from '../types/api';

function getUserId(req: Request): string {
  return req.user?.id ?? '';
}

async function getStudentIdByUserId(userId: string): Promise<string | null> {
  const r = await getStudentIdAndAccessType(userId);
  return r?.studentId ?? null;
}

/** 학생 ID와 관리자 접속 여부 반환 (관리자용 계정으로 로그인 시 isAdminAccess true) */
async function getStudentIdAndAccessType(userId: string): Promise<{ studentId: string; isAdminAccess: boolean } | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const uid = new mongoose.Types.ObjectId(userId);
  const byMain = await Student.findOne({ userId: uid }).select('_id').lean().exec();
  if (byMain) return { studentId: byMain._id.toString(), isAdminAccess: false };
  const byAdminAccess = await Student.findOne({ adminAccessUserId: uid }).select('_id').lean().exec();
  if (byAdminAccess) return { studentId: byAdminAccess._id.toString(), isAdminAccess: true };
  return null;
}

export async function getClasses(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const studentId = await getStudentIdByUserId(getUserId(req));
    if (!studentId) {
      res.status(404).json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
      return;
    }
    const classes = await studentDataService.getStudentClasses(studentId);
    res.status(200).json({ success: true, data: { classes } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '소속 반 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getDashboard(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const info = await getStudentIdAndAccessType(getUserId(req));
    if (!info) {
      res.status(404).json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
      return;
    }
    const classId = req.query.classId as string | undefined;
    const viewAs = info.isAdminAccess ? 'admin_access' : 'student';
    const data = await studentDataService.getDashboard(info.studentId, classId || null, viewAs);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '대시보드 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getLessons(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const info = await getStudentIdAndAccessType(getUserId(req));
    if (!info) {
      res.status(404).json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
      return;
    }
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const classId = req.query.classId as string | undefined;
    const result = await studentDataService.getLessons(info.studentId, from, to, classId || null);
    const payload = result ?? { lessons: [] };
    if (info.isAdminAccess && payload && typeof payload === 'object' && 'lessons' in payload) {
      (payload as { isAdminAccess?: boolean }).isAdminAccess = true;
    }
    res.status(200).json({ success: true, data: payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : '진도/과제 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getTests(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const studentId = await getStudentIdByUserId(getUserId(req));
    if (!studentId) {
      res.status(404).json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
      return;
    }
    const result = await studentDataService.getTests(studentId);
    res.status(200).json({ success: true, data: result ?? { tests: [] } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '테스트 현황 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getMonthlyStatistics(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const studentId = await getStudentIdByUserId(getUserId(req));
    if (!studentId) {
      res.status(404).json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
      return;
    }
    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);
    const classId = req.query.classId as string | undefined;
    const result = await studentDataService.getMonthlyStatistics(studentId, year, month, classId || null);
    if (!result) {
      res.status(404).json({ success: false, message: '소속 반 정보를 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '월별 통계 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
