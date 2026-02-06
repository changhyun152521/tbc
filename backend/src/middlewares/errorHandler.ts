import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const message = status === 500 ? '서버 오류가 발생했습니다.' : (err.message || '오류가 발생했습니다.');
  res.status(status).json({
    success: false,
    message,
  });
}
