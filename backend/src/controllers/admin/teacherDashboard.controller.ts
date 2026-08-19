import { Request, Response } from 'express';
import * as teacherDashboardService from '../../services/teacher/teacherDashboard.service';
import { ApiResponse } from '../../types/api';

export async function getDashboard(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const role = req.user?.role ?? '';
    if (role !== 'teacher') {
      res.status(403).json({ success: false, message: '강사 전용 API입니다.' });
      return;
    }
    const data = await teacherDashboardService.getTeacherDashboard(req.user?.id ?? '');
    res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '대시보드 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
