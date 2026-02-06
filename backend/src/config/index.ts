/**
 * TBC CLASS Backend Config
 * 기획 문서 정책: .env 미사용, TypeScript config 기반만 사용
 */

export const serverConfig = {
  port: 3001,
};

export const dbConfig = {
  uri: 'mongodb://localhost:27017/tbc-class',
};

export const jwtConfig = {
  secret: 'tbc-class-admin-secret-change-in-production',
  expiresIn: '24h',
};
