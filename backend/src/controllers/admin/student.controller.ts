import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as studentService from '../../services/admin/student.service';
import { ApiResponse } from '../../types/api';

export async function createStudent(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const body = req.body;
    const student = await studentService.createStudent({
      name: body.name,
      school: body.school,
      grade: body.grade,
      studentPhone: body.studentPhone,
      parentPhone: body.parentPhone,
      studentLoginId: body.studentLoginId,
      studentPassword: body.studentPassword,
      parentLoginId: body.parentLoginId,
      parentPassword: body.parentPassword,
      classId: body.classId,
    });
    res.status(201).json({ success: true, data: student });
  } catch (err) {
    const message = err instanceof Error ? err.message : '학생 생성에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listStudents(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { name, grade, classId, search, page, limit } = req.query;
    const result = await studentService.listStudents({
      name: name as string,
      grade: grade as string,
      classId: classId as string,
      search: search as string,
      page: page as string,
      limit: limit as string,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('listStudents error:', err);
    const message = err instanceof Error ? err.message : '학생 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getStudent(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const student = await studentService.getStudentById(req.params.id);
    if (!student) {
      res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: student });
  } catch (err) {
    const message = err instanceof Error ? err.message : '학생 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updateStudent(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const body = req.body;
    const student = await studentService.updateStudent(req.params.id, {
      name: body.name,
      school: body.school,
      grade: body.grade,
      studentPhone: body.studentPhone,
      parentPhone: body.parentPhone,
      studentLoginId: body.studentLoginId,
      studentPassword: body.studentPassword,
      parentLoginId: body.parentLoginId,
      parentPassword: body.parentPassword,
      classId: body.classId,
    });
    if (!student) {
      res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: student });
  } catch (err) {
    const message = err instanceof Error ? err.message : '학생 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function deleteStudent(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const deleted = await studentService.deleteStudent(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, message: '삭제되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '학생 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
