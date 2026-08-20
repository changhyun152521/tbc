import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import app from './app';
import { serverConfig, dbConfig } from './config';
import { User } from './models/User.model';
import { dropLegacyVideoWatchProgressIndexes } from './models/VideoWatchProgress.model';

const SALT_ROUNDS = 10;
const ADMIN_LOGIN_ID = 'mathchang';
const ADMIN_PASSWORD = 'a5277949';

async function ensureAdmin() {
  const legacy = await User.findOne({ role: 'admin', loginId: 'admin' }).exec();
  if (legacy) {
    legacy.loginId = ADMIN_LOGIN_ID;
    legacy.passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    await legacy.save();
    console.log(`Admin 계정이 ${ADMIN_LOGIN_ID}(으)로 변경되었습니다.`);
    return;
  }

  const exists = await User.exists({ role: 'admin' });
  if (!exists) {
    await User.create({
      role: 'admin',
      loginId: ADMIN_LOGIN_ID,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS),
      name: '관리자',
    });
    console.log(`초기 Admin 계정 생성됨 (loginId: ${ADMIN_LOGIN_ID})`);
  }
}

async function main() {
  await mongoose.connect(dbConfig.uri);
  console.log('MongoDB 연결 성공');
  await dropLegacyVideoWatchProgressIndexes();
  await ensureAdmin();

  app.listen(serverConfig.port, () => {
    console.log(`TBC CLASS API 실행 중: http://localhost:${serverConfig.port}`);
  });
}

main().catch((err) => {
  console.error('서버 시작 실패:', err);
  process.exit(1);
});
