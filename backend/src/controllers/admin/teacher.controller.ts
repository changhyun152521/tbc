import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as teacherService from '../../services/admin/teacher.service';
import { ApiResponse } from '../../types/api';

export async function createTeacher(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const body = req.body;
    const teacher = await teacherService.createTeacher({
      name: body.name,
      loginId: body.loginId,
      password: body.password,
      phone: body.phone,
      description: body.description,
    });
    res.status(201).json({ success: true, data: teacher });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 생성에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listTeachers(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const search = (req.query.search as string) ?? '';
    const list = await teacherService.listTeachers(search);
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getTeacher(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const teacher = await teacherService.getTeacherById(req.params.id);
    if (!teacher) {
      res.status(404).json({ success: false, message: '강사를 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: teacher });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updateTeacher(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const body = req.body;
    const teacher = await teacherService.updateTeacher(req.params.id, {
      name: body.name,
      loginId: body.loginId,
      password: body.password,
      phone: body.phone,
      description: body.description,
    });
    if (!teacher) {
      res.status(404).json({ success: false, message: '강사를 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: teacher });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function deleteTeacher(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const deleted = await teacherService.deleteTeacher(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: '강사를 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, message: '삭제되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
