import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';
import { ApiResponse, JwtPayload } from '../types/api';

export function adminAuthMiddleware(req: Request, res: Response<ApiResponse>, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    if (decoded.role !== 'admin') {
      res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
      return;
    }
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: '유효하지 않거나 만료된 토큰입니다.' });
  }
}
