import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as teacherClassService from '../services/teacher/teacherClass.service';
import * as teacherLessonService from '../services/teacher/teacherLesson.service';
import * as teacherTestService from '../services/teacher/teacherTest.service';
import { ApiResponse } from '../types/api';

function getUserId(req: Request): string {
  return req.user?.id ?? '';
}
function getRole(req: Request): string {
  return req.user?.role ?? '';
}

// ---- 반 ----
export async function listClasses(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const list = await teacherClassService.listClassesForTeacher(getUserId(req), getRole(req));
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '반 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getClassStudents(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const list = await teacherClassService.getClassStudents(
      req.params.classId,
      getUserId(req),
      getRole(req)
    );
    if (list === null) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '학생 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

// ---- 수업 ----
export async function createLesson(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const body = req.body;
    const lesson = await teacherLessonService.createLesson(
      {
        classId: req.params.classId,
        date: body.date,
        period: body.period,
        progress: body.progress,
        homework: body.homework,
        homeworkDueDate: body.homeworkDueDate ? new Date(body.homeworkDueDate) : undefined,
        attendanceStatus: body.attendanceStatus,
        homeworkDone: body.homeworkDone,
      },
      getUserId(req),
      getRole(req)
    );
    if (!lesson) {
      res.status(403).json({ success: false, message: '해당 반에 대한 권한이 없습니다.' });
      return;
    }
    res.status(201).json({ success: true, data: lesson });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 생성에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listLessons(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const list = await teacherLessonService.listLessonsByClass(
      req.params.classId,
      getUserId(req),
      getRole(req),
      req.query.from as string,
      req.query.to as string
    );
    if (list === null) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getLesson(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const lesson = await teacherLessonService.getLessonById(
      req.params.lessonId,
      getUserId(req),
      getRole(req)
    );
    if (!lesson) {
      res.status(404).json({ success: false, message: '수업을 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: lesson });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updateLesson(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const body = req.body;
    const lesson = await teacherLessonService.updateLesson(
      req.params.lessonId,
      {
        date: body.date ? new Date(body.date) : undefined,
        period: body.period,
        progress: body.progress,
        homework: body.homework,
        homeworkDueDate: body.homeworkDueDate ? new Date(body.homeworkDueDate) : undefined,
        attendanceStatus: body.attendanceStatus,
        homeworkDone: body.homeworkDone,
      },
      getUserId(req),
      getRole(req)
    );
    if (!lesson) {
      res.status(404).json({ success: false, message: '수업을 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: lesson });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function deleteLesson(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const ok = await teacherLessonService.deleteLesson(
      req.params.lessonId,
      getUserId(req),
      getRole(req)
    );
    if (!ok) {
      res.status(404).json({ success: false, message: '수업을 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, message: '삭제되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '수업 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

// ---- 테스트 ----
export async function createTest(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const body = req.body;
    const test = await teacherTestService.createTest(
      {
        classId: req.params.classId,
        testType: body.testType,
        date: body.date,
        questionCount: body.questionCount != null ? Number(body.questionCount) : undefined,
        subject: body.subject,
        bigUnit: body.bigUnit,
        smallUnit: body.smallUnit,
        source: body.source,
      },
      getUserId(req),
      getRole(req)
    );
    if (!test) {
      res.status(403).json({ success: false, message: '해당 반에 대한 권한이 없습니다.' });
      return;
    }
    res.status(201).json({ success: true, data: test });
  } catch (err) {
    const message = err instanceof Error ? err.message : '테스트 생성에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function listTests(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const list = await teacherTestService.listTestsByClass(
      req.params.classId,
      getUserId(req),
      getRole(req)
    );
    if (list === null) {
      res.status(404).json({ success: false, message: '반을 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '테스트 목록 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getTest(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const test = await teacherTestService.getTestById(
      req.params.testId,
      getUserId(req),
      getRole(req)
    );
    if (!test) {
      res.status(404).json({ success: false, message: '테스트를 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: test });
  } catch (err) {
    const message = err instanceof Error ? err.message : '테스트 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function updateTest(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const body = req.body;
    const test = await teacherTestService.updateTest(
      req.params.testId,
      {
        date: body.date ? new Date(body.date) : undefined,
        questionCount: body.questionCount != null ? Number(body.questionCount) : undefined,
        subject: body.subject,
        bigUnit: body.bigUnit,
        smallUnit: body.smallUnit,
        source: body.source,
      },
      getUserId(req),
      getRole(req)
    );
    if (!test) {
      res.status(404).json({ success: false, message: '테스트를 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: test });
  } catch (err) {
    const message = err instanceof Error ? err.message : '테스트 수정에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function deleteTest(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const ok = await teacherTestService.deleteTest(
      req.params.testId,
      getUserId(req),
      getRole(req)
    );
    if (!ok) {
      res.status(404).json({ success: false, message: '테스트를 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, message: '삭제되었습니다.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '테스트 삭제에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function getTestScores(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const list = await teacherTestService.getTestScores(
      req.params.testId,
      getUserId(req),
      getRole(req)
    );
    if (list === null) {
      res.status(404).json({ success: false, message: '테스트를 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : '점수 조회에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}

export async function upsertTestScore(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }
    const { studentId, score } = req.body;
    const test = await teacherTestService.upsertTestScore(
      req.params.testId,
      studentId,
      Number(score),
      getUserId(req),
      getRole(req)
    );
    if (!test) {
      res.status(404).json({ success: false, message: '테스트를 찾을 수 없거나 접근 권한이 없습니다.' });
      return;
    }
    res.status(200).json({ success: true, data: test });
  } catch (err) {
    const message = err instanceof Error ? err.message : '점수 입력에 실패했습니다.';
    res.status(500).json({ success: false, message });
  }
}
