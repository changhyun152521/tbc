import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as classService from '../../services/admin/class.service';
import { ApiResponse } from '../../types/api';

export async function createClass(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const body = req.body;
    const classDoc = await classService.createClass({
      name: body.name,
      description: body.description,
    });
    res.status(201).json({ success: true, data: classDoc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '반 생성에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listClasses(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const list = await classService.listClasses();
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '반 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

/** 수업관리 진입용: 반 목록 + 오늘 교시 수 */
export async function listClassesForLessons(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const list = await classService.listClassesForLessonManagement();
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '반 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

/** 시험관리 진입용: 반 목록 + 반별 시험 수 */
export async function listClassesForTests(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const list = await classService.listClassesForTestManagement();
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '반 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getClass(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const classDoc = await classService.getClassById(req.params.id);
    if (!classDoc) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: classDoc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '반 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updateClass(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const body = req.body;
    const classDoc = await classService.updateClass(req.params.id, {
      name: body.name,
      description: body.description,
      teacherIds: Array.isArray(body.teacherIds) ? body.teacherIds : undefined,
    });
    if (!classDoc) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: classDoc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '반 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function deleteClass(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const deleted = await classService.deleteClass(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, message: '삭제되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '반 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function addTeacher(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const classId = req.params.id;
    const teacherId = req.body.teacherId;
    const classDoc = await classService.addTeacherToClass(classId, teacherId);
    if (!classDoc) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: classDoc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 추가에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function removeTeacher(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const classId = req.params.id;
    const teacherId = req.body.teacherId ?? req.query.teacherId;
    if (!teacherId) {
      res.status(400).json({ success: false, message: 'teacherId가 필요합니다.' });
      return;
    }
    const classDoc = await classService.removeTeacherFromClass(classId, teacherId as string);
    if (!classDoc) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: classDoc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '강사 제거에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function addStudents(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const classId = req.params.id;
    const studentIds = req.body.studentIds;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ success: false, message: 'studentIds 배열이 필요합니다.' });
      return;
    }
    const classDoc = await classService.addStudentsToClass(classId, studentIds);
    if (!classDoc) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: classDoc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '학생 추가에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function removeStudent(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const classId = req.params.id;
    const studentId = req.body.studentId ?? req.query.studentId;
    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
      return;
    }
    const classDoc = await classService.removeStudentFromClass(classId, studentId as string);
    if (!classDoc) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: classDoc });
  } catch (err) {
    const message = err instanceof Error ? err.message : '학생 제거에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
