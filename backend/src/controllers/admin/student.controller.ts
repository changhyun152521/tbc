import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import * as studentService from '../../services/admin/student.service';
import * as authService from '../../services/auth.service';
import { Class } from '../../models/Class.model';
import {
  canAccessClass,
  getAssignedStudentIds,
} from '../../services/teacher/teacherClass.service';
import { ApiResponse } from '../../types/api';

async function resolveStudentIdsFilter(
  role: string | undefined,
  userId: string,
  classId: unknown,
  myClasses: unknown
): Promise<{ studentIds?: string[]; error?: string; status?: number }> {
  const wantMyClasses = myClasses === '1' || myClasses === 'true';
  const classIdStr = typeof classId === 'string' ? classId.trim() : '';

  if (wantMyClasses) {
    if (role !== 'teacher') {
      return { error: '내 반 필터는 강사만 사용할 수 있습니다.', status: 403 };
    }
    return { studentIds: await getAssignedStudentIds(userId) };
  }

  if (!classIdStr) return {};

  if (!mongoose.Types.ObjectId.isValid(classIdStr)) {
    return { error: '올바른 반 ID가 아닙니다.', status: 400 };
  }

  if (role === 'teacher') {
    const ok = await canAccessClass(classIdStr, userId, role);
    if (!ok) return { error: '이 반에 대한 권한이 없습니다.', status: 403 };
  }

  const classDoc = await Class.findById(classIdStr).select('studentIds').lean().exec();
  if (!classDoc) return { error: '반을 찾을 수 없습니다.', status: 404 };
  return {
    studentIds: (classDoc.studentIds ?? []).map((id) => id.toString()),
  };
}

export async function createStudent(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const body = req.body;
    // 디버깅: 실제 수신 데이터 확인
    console.log('[createStudent] body:', JSON.stringify({
      name: body.name,
      studentPhone: body.studentPhone,
      parentPhone: body.parentPhone,
      studentLoginId: body.studentLoginId,
      parentLoginId: body.parentLoginId,
      studentPhoneType: typeof body.studentPhone,
      parentPhoneType: typeof body.parentPhone,
    }));
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
    const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> };
    let message = err instanceof Error ? err.message : '학생 생성에 실패했습니다.';
    let status = 500;
    if (mongoErr?.code === 11000) {
      status = 400;
      const dup = mongoErr.keyValue?.loginId ?? '알 수 없음';
      message = `이미 사용 중인 로그인 ID입니다: "${dup}". 다른 ID를 사용해주세요.`;
      console.error('[createStudent] E11000 duplicate key:', mongoErr.keyValue);
    }
    res.status(status).json({ success: false, message });
  }
}

export async function listStudents(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { name, grade, classId, search, page, limit, myClasses } = req.query;
    const role = req.user?.role;
    const userId = req.user?.id ?? '';

    const scope = await resolveStudentIdsFilter(role, userId, classId, myClasses);
    if (scope.error) {
      res.status(scope.status ?? 400).json({ success: false, message: scope.error });
      return;
    }

    let assignedStudentIds: string[] | null | undefined;
    if (role === 'teacher') {
      assignedStudentIds = await getAssignedStudentIds(userId);
    } else {
      assignedStudentIds = null;
    }
    const result = await studentService.listStudents({
      name: name as string,
      grade: grade as string,
      search: search as string,
      page: page != null ? parseInt(String(page), 10) : undefined,
      limit: limit != null ? parseInt(String(limit), 10) : undefined,
      studentIds: scope.studentIds,
      includeLastAccess: role === 'admin' || role === 'teacher',
      includeParentLastAccess: role === 'admin' || role === 'teacher',
      includeLoginIds: role === 'admin',
      includePreviewAllowed: role === 'admin' || role === 'teacher',
      lastAccessStudentIds: assignedStudentIds,
      parentLastAccessStudentIds: assignedStudentIds,
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

export async function createPreviewSession(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const view = req.body.view as 'student' | 'parent';
    const result = await authService.createPreviewSession(
      req.params.id,
      view,
      req.user?.id ?? '',
      req.user?.role ?? ''
    );
    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '미리보기 세션 생성에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function resetCredentials(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: '관리자만 초기화할 수 있습니다.' });
      return;
    }
    const target = req.body.target as 'student' | 'parent' | 'both';
    const result = await studentService.resetCredentials(req.params.id, target);
    if (!result.ok) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({ success: true, message: '계정이 전화번호로 초기화되었습니다. 다음 로그인 시 아이디·비밀번호 변경이 필요합니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '계정 초기화에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
