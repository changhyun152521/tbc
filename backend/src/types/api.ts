export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface JwtPayload {
  sub: string;
  role: string;
  /** 관리자·강사 미리보기 세션 — 쓰기 API 차단 */
  preview?: boolean;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; preview?: boolean };
    }
  }
}

export {};
