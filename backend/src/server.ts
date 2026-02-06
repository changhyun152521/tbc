import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import app from './app';
import { serverConfig, dbConfig } from './config';
import { User } from './models/User.model';

const SALT_ROUNDS = 10;

async function ensureAdmin() {
  const exists = await User.exists({ role: 'admin' });
  if (!exists) {
    await User.create({
      role: 'admin',
      loginId: 'admin',
      passwordHash: await bcrypt.hash('admin', SALT_ROUNDS),
      name: '관리자',
    });
    console.log('초기 Admin 계정 생성됨 (loginId: admin, password: admin)');
  }
}

async function main() {
  await mongoose.connect(dbConfig.uri);
  console.log('MongoDB 연결 성공');
  await ensureAdmin();

  app.listen(serverConfig.port, () => {
    console.log(`TBC CLASS API 실행 중: http://localhost:${serverConfig.port}`);
  });
}

main().catch((err) => {
  console.error('서버 시작 실패:', err);
  process.exit(1);
});
