import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import * as studentController from '../controllers/admin/student.controller';
import * as teacherController from '../controllers/admin/teacher.controller';
import * as classController from '../controllers/admin/class.controller';
import * as lessonDayController from '../controllers/admin/lessonDay.controller';

const router = Router();

router.use(authenticate);
router.use(requireRoles(['admin', 'teacher']));

const mongoId = () => param('id').isMongoId().withMessage('올바른 ID가 아닙니다.');

// Students
router.post(
  '/students',
  [
    body('name').trim().notEmpty().withMessage('이름은 필수입니다.'),
    body('school').trim().notEmpty().withMessage('학교는 필수입니다.'),
    body('grade').trim().notEmpty().withMessage('학년은 필수입니다.'),
    body('studentPhone').notEmpty().withMessage('학생 전화번호는 필수입니다.'),
    body('parentPhone').notEmpty().withMessage('학부모 전화번호는 필수입니다.'),
  ],
  studentController.createStudent
);
router.get('/students', studentController.listStudents);
router.get('/students/:id', mongoId(), studentController.getStudent);
router.put(
  '/students/:id',
  [
    param('id').isMongoId().withMessage('올바른 ID가 아닙니다.'),
  ],
  studentController.updateStudent
);
router.delete('/students/:id', mongoId(), studentController.deleteStudent);

// Teachers
router.post(
  '/teachers',
  [
    body('name').trim().notEmpty().withMessage('이름은 필수입니다.'),
    body('loginId').trim().notEmpty().withMessage('loginId는 필수입니다.'),
    body('password').notEmpty().withMessage('password는 필수입니다.'),
  ],
  teacherController.createTeacher
);
router.get('/teachers', teacherController.listTeachers);
router.get('/teachers/:id', mongoId(), teacherController.getTeacher);
router.put(
  '/teachers/:id',
  [param('id').isMongoId().withMessage('올바른 ID가 아닙니다.')],
  teacherController.updateTeacher
);
router.delete('/teachers/:id', mongoId(), teacherController.deleteTeacher);

// Classes
router.post(
  '/classes',
  [body('name').trim().notEmpty().withMessage('반 이름은 필수입니다.')],
  classController.createClass
);
router.get('/classes', classController.listClasses);
router.get('/classes/for-lessons', classController.listClassesForLessons);
router.get('/classes/for-tests', classController.listClassesForTests);
router.get('/classes/:id', mongoId(), classController.getClass);
router.put(
  '/classes/:id',
  [param('id').isMongoId().withMessage('올바른 ID가 아닙니다.')],
  classController.updateClass
);
router.delete('/classes/:id', mongoId(), classController.deleteClass);

// Class - Teachers
router.post(
  '/classes/:id/teachers',
  [
    param('id').isMongoId().withMessage('올바른 반 ID가 아닙니다.'),
    body('teacherId').notEmpty().withMessage('teacherId는 필수입니다.').isMongoId().withMessage('올바른 강사 ID가 아닙니다.'),
  ],
  classController.addTeacher
);
router.delete(
  '/classes/:id/teachers',
  [
    param('id').isMongoId().withMessage('올바른 반 ID가 아닙니다.'),
    body('teacherId').optional(),
    query('teacherId').optional(),
  ],
  classController.removeTeacher
);

// Class - Students
router.post(
  '/classes/:id/students',
  [
    param('id').isMongoId().withMessage('올바른 반 ID가 아닙니다.'),
    body('studentIds').isArray().withMessage('studentIds는 배열이어야 합니다.'),
    body('studentIds.*').isMongoId().withMessage('올바른 학생 ID가 아닙니다.'),
  ],
  classController.addStudents
);
router.delete(
  '/classes/:id/students',
  [
    param('id').isMongoId().withMessage('올바른 반 ID가 아닙니다.'),
    body('studentId').optional(),
    query('studentId').optional(),
  ],
  classController.removeStudent
);

// Lesson Days (수업 관리: 날짜+반 단위, 교시별 출결/과제)
router.post(
  '/lesson-days',
  [
    body('classId').notEmpty().withMessage('classId는 필수입니다.').isMongoId().withMessage('올바른 반 ID가 아닙니다.'),
    body('date').notEmpty().withMessage('date는 필수입니다.'),
  ],
  lessonDayController.createLessonDay
);
router.get('/lesson-days', lessonDayController.listLessonDays);
router.get('/lesson-days/by-class-date', lessonDayController.getLessonDayByClassAndDate);
router.get('/lesson-days/:id', param('id').isMongoId().withMessage('올바른 ID가 아닙니다.'), lessonDayController.getLessonDay);
router.put(
  '/lesson-days/:id',
  [param('id').isMongoId().withMessage('올바른 ID가 아닙니다.')],
  lessonDayController.updateLessonDay
);
router.delete('/lesson-days/:id', param('id').isMongoId().withMessage('올바른 ID가 아닙니다.'), lessonDayController.deleteLessonDay);
router.post(
  '/lesson-days/:id/periods',
  [
    param('id').isMongoId().withMessage('올바른 ID가 아닙니다.'),
    body('teacherId').notEmpty().withMessage('teacherId는 필수입니다.').isMongoId().withMessage('올바른 강사 ID가 아닙니다.'),
  ],
  lessonDayController.addPeriod
);
router.delete(
  '/lesson-days/:id/periods',
  [
    param('id').isMongoId().withMessage('올바른 ID가 아닙니다.'),
    query('periodIndex').isInt({ min: 0 }).withMessage('periodIndex는 0 이상 정수입니다.'),
  ],
  lessonDayController.removePeriod
);
router.put(
  '/lesson-days/:id/periods',
  [
    param('id').isMongoId().withMessage('올바른 ID가 아닙니다.'),
    body('periodIndex').isInt({ min: 0 }).withMessage('periodIndex는 0 이상 정수입니다.'),
  ],
  lessonDayController.updatePeriod
);

export default router;
