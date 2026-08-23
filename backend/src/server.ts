import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import app from './app';
import { serverConfig, dbConfig } from './config';
import { User } from './models/User.model';
import { Student } from './models/Student.model';
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
      mustChangePassword: false,
    });
    console.log(`초기 Admin 계정 생성됨 (loginId: ${ADMIN_LOGIN_ID})`);
  }
}

/** 기존 강사(아직 비밀번호 변경 완료 전)는 첫 로그인 대상 — 이미 false인 계정은 건드리지 않음 */
async function ensureTeachersMustChangePassword() {
  const result = await User.updateMany(
    { role: 'teacher', mustChangePassword: { $ne: false } },
    { $set: { mustChangePassword: true } }
  ).exec();
  if (result.modifiedCount > 0) {
    console.log(`강사 ${result.modifiedCount}명 mustChangePassword=true 로 설정됨`);
  }
}

/**
 * 기존 학생·학부모 전원 첫 로그인 시 아이디·비밀번호 변경 유도 (1회만 실행).
 * 관리 접속 계정(adminAccessUserId)은 제외.
 */
async function ensureStudentParentMustChangePassword() {
  const db = mongoose.connection.db;
  if (!db) return;
  const migrations = db.collection('system_migrations');
  const key = 'student_parent_must_change_password_v1';
  const already = await migrations.findOne({ key });
  if (already) return;

  const adminAccessIds = await Student.distinct('adminAccessUserId').exec();
  const excludeIds = adminAccessIds.filter(Boolean);
  const result = await User.updateMany(
    {
      role: { $in: ['student', 'parent'] },
      ...(excludeIds.length > 0 ? { _id: { $nin: excludeIds } } : {}),
    },
    { $set: { mustChangePassword: true } }
  ).exec();
  await migrations.insertOne({ key, at: new Date(), modifiedCount: result.modifiedCount });
  console.log(`학생·학부모 ${result.modifiedCount}명 mustChangePassword=true 로 설정됨 (1회 마이그레이션)`);
}

async function migratePeriodNumbers() {
  const { LessonDay } = await import('./models/LessonDay.model');
  const lessons = await LessonDay.find({ 'periods.0': { $exists: true } }).exec();
  let count = 0;
  for (const lesson of lessons) {
    let changed = false;
    lesson.periods.forEach((p, i) => {
      if (p.periodNumber == null || p.periodNumber < 1) {
        p.periodNumber = i + 1;
        changed = true;
      }
    });
    if (changed) {
      await lesson.save();
      count++;
    }
  }
  if (count > 0) console.log(`교시 periodNumber 마이그레이션: ${count}개 수업일`);
}

async function main() {
  await mongoose.connect(dbConfig.uri);
  console.log('MongoDB 연결 성공');
  await dropLegacyVideoWatchProgressIndexes();
  await ensureAdmin();
  await ensureTeachersMustChangePassword();
  await ensureStudentParentMustChangePassword();
  await migratePeriodNumbers();

  app.listen(serverConfig.port, () => {
    console.log(`TBC CLASS API 실행 중: http://localhost:${serverConfig.port}`);
  });
}

main().catch((err) => {
  console.error('서버 시작 실패:', err);
  process.exit(1);
});
