import { Router } from 'express';
import { body } from 'express-validator';
import { login, findLoginId } from '../controllers/auth.controller';

const router = Router();

router.post(
  '/find-login-id',
  [
    body('type').isIn(['student', 'parent']).withMessage('type은 student 또는 parent여야 합니다.'),
    body('name').trim().notEmpty().withMessage('이름(학생명)은 필수입니다.'),
    body('phone').trim().notEmpty().withMessage('전화번호는 필수입니다.'),
  ],
  findLoginId
);

router.post(
  '/login',
  [
    body('loginId').trim().notEmpty().withMessage('loginId는 필수입니다.'),
    body('password').notEmpty().withMessage('password는 필수입니다.'),
  ],
  login
);

export default router;
