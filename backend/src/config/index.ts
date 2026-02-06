/**
 * TBC CLASS Backend Config
 * .env 사용: MONGODB_URI, JWT_SECRET 등 환경변수로 설정
 */

export const serverConfig = {
  port: parseInt(process.env.PORT ?? '3001', 10),
};

export const dbConfig = {
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/tbc-class',
};

export const jwtConfig = {
  secret: process.env.JWT_SECRET ?? 'tbc-class-admin-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
};

/** CORS 허용 오리진 (쉼표 구분, 배포 시 프론트엔드 URL) */
export const corsOrigin = process.env.CORS_ORIGIN ?? '';
