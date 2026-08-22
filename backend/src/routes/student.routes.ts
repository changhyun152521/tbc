import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import * as studentController from '../controllers/student.controller';
import * as announcementController from '../controllers/admin/announcement.controller';
import * as reviewVideoController from '../controllers/student/reviewVideo.controller';

const router = Router();

router.use(authenticate);
router.use(requireRoles(['student']));

// 소속 반 목록
router.get('/classes', studentController.getClasses);

// 대시보드
router.get('/dashboard', studentController.getDashboard);

router.get('/announcements/active', announcementController.listActiveForMe);
router.post(
  '/announcements/:id/dismiss',
  [param('id').isMongoId().withMessage('올바른 ID가 아닙니다.')],
  announcementController.dismiss
);

router.get('/review-videos/pending', reviewVideoController.listPending);
router.get('/review-videos/recent', reviewVideoController.listRecentReview);
router.put('/review-videos/progress', reviewVideoController.putProgress);
router.get(
  '/review-videos/:lessonDayId/:periodId',
  [
    param('lessonDayId').isMongoId().withMessage('올바른 수업 ID가 아닙니다.'),
    param('periodId').isMongoId().withMessage('올바른 교시 ID가 아닙니다.'),
  ],
  reviewVideoController.getReviewVideo
);

// 진도/과제 현황 (쿼리: from, to 선택)
router.get(
  '/lessons',
  [
    query('from').optional().isISO8601().withMessage('from은 ISO 날짜 형식이어야 합니다.'),
    query('to').optional().isISO8601().withMessage('to는 ISO 날짜 형식이어야 합니다.'),
  ],
  studentController.getLessons
);

// 테스트 현황
router.get('/tests', studentController.getTests);

router.post(
  '/lessons/:lessonDayId/:periodId/reply',
  [
    param('lessonDayId').isMongoId().withMessage('올바른 수업 ID가 아닙니다.'),
    param('periodId').isMongoId().withMessage('올바른 교시 ID가 아닙니다.'),
    body('body').isString().withMessage('답글 내용을 입력해 주세요.'),
  ],
  studentController.saveReply
);

// 월별 통계 (쿼리: year, month 필수)
router.get(
  '/statistics/monthly',
  [
    query('year').notEmpty().withMessage('year는 필수입니다.').isInt({ min: 2000, max: 2100 }),
    query('month').notEmpty().withMessage('month는 필수입니다.').isInt({ min: 1, max: 12 }),
  ],
  studentController.getMonthlyStatistics
);

export default router;
