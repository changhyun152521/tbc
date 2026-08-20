import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middlewares/auth.middleware';
import * as meController from '../controllers/me.controller';

const router = Router();

router.use(authenticate);

router.get('/', meController.getMe);
router.get('/notifications', meController.listNotifications);
router.get('/notifications/unread-count', meController.getUnreadNotificationCount);
router.post(
  '/notifications/:id/read',
  [param('id').isMongoId().withMessage('올바른 알림 ID가 아닙니다.')],
  meController.markNotificationRead
);
router.post('/notifications/read-all', meController.markAllNotificationsRead);

router.put(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('현재 비밀번호는 필수입니다.'),
    body('newPassword').notEmpty().withMessage('새 비밀번호는 필수입니다.'),
  ],
  meController.updatePassword
);

router.put(
  '/loginId',
  [body('newLoginId').trim().notEmpty().withMessage('새 로그인 ID는 필수입니다.')],
  meController.updateLoginId
);

router.put(
  '/phone',
  [body('newPhone').trim().notEmpty().withMessage('새 전화번호는 필수입니다.')],
  meController.updatePhone
);

export default router;
