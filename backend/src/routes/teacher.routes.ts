import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import * as teacherController from '../controllers/teacher.controller';

const router = Router();

router.use(authenticate);
router.use(requireRoles(['admin', 'teacher']));

const mongoId = (name: string) => param(name).isMongoId().withMessage('올바른 ID가 아닙니다.');

// 담당 반 목록
router.get('/classes', teacherController.listClasses);

// 특정 반 학생 목록
router.get('/classes/:classId/students', mongoId('classId'), teacherController.getClassStudents);

// 수업: 목록, 생성
router.get('/classes/:classId/lessons', mongoId('classId'), teacherController.listLessons);
router.post(
  '/classes/:classId/lessons',
  [
    mongoId('classId'),
    body('date').notEmpty().withMessage('수업 일자는 필수입니다.'),
    body('period').trim().notEmpty().withMessage('교시는 필수입니다.'),
  ],
  teacherController.createLesson
);

// 수업: 조회, 수정, 삭제 (출석·과제완료는 수정으로 처리)
router.get('/lessons/:lessonId', mongoId('lessonId'), teacherController.getLesson);
router.put('/lessons/:lessonId', mongoId('lessonId'), teacherController.updateLesson);
router.delete('/lessons/:lessonId', mongoId('lessonId'), teacherController.deleteLesson);

// 테스트: 목록, 생성
router.get('/classes/:classId/tests', mongoId('classId'), teacherController.listTests);
router.post(
  '/classes/:classId/tests',
  [
    mongoId('classId'),
    body('testType').isIn(['weeklyTest', 'realTest']).withMessage('testType은 weeklyTest 또는 realTest입니다.'),
    body('date').notEmpty().withMessage('테스트 일자는 필수입니다.'),
  ],
  teacherController.createTest
);

// 테스트: 조회, 수정, 삭제
router.get('/tests/:testId', mongoId('testId'), teacherController.getTest);
router.put('/tests/:testId', mongoId('testId'), teacherController.updateTest);
router.delete('/tests/:testId', mongoId('testId'), teacherController.deleteTest);

// 테스트 점수: 조회, 입력/수정
router.get('/tests/:testId/scores', mongoId('testId'), teacherController.getTestScores);
router.post(
  '/tests/:testId/scores',
  [
    mongoId('testId'),
    body('studentId').notEmpty().withMessage('studentId는 필수입니다.'),
    body('score').isNumeric().withMessage('score는 숫자입니다.'),
  ],
  teacherController.upsertTestScore
);

export default router;
