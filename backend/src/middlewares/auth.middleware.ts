import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';
import { ApiResponse, JwtPayload } from '../types/api';
import { UserRole } from '../models/User.model';

/**
 * JWT 검증 후 request.user에 사용자 정보 주입.
 * 실패 시 401 반환.
 */
export function authenticate(req: Request, res: Response<ApiResponse>, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: '유효하지 않거나 만료된 토큰입니다.' });
  }
}

/**
 * 역할 기반 접근 제어. authenticate 이후 사용.
 * req.user.role이 roles에 없으면 403 반환.
 */
export function requireRoles(roles: UserRole[]) {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({ success: false, message: '이 리소스에 대한 권한이 없습니다.' });
      return;
    }
    next();
  };
}
