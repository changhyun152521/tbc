import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import * as parentController from '../controllers/parent.controller';

const router = Router();

router.use(authenticate);
router.use(requireRoles(['parent']));

// 자녀 소속 반 목록
router.get('/classes', parentController.getClasses);

// 자녀 대시보드
router.get('/dashboard', parentController.getDashboard);

// 자녀 진도/과제 현황 (쿼리: from, to 선택)
router.get(
  '/lessons',
  [
    query('from').optional().isISO8601().withMessage('from은 ISO 날짜 형식이어야 합니다.'),
    query('to').optional().isISO8601().withMessage('to는 ISO 날짜 형식이어야 합니다.'),
  ],
  parentController.getLessons
);

// 자녀 테스트 현황
router.get('/tests', parentController.getTests);

// 자녀 월별 통계 (쿼리: year, month 필수)
router.get(
  '/statistics/monthly',
  [
    query('year').notEmpty().withMessage('year는 필수입니다.').isInt({ min: 2000, max: 2100 }),
    query('month').notEmpty().withMessage('month는 필수입니다.').isInt({ min: 1, max: 12 }),
  ],
  parentController.getMonthlyStatistics
);

export default router;
