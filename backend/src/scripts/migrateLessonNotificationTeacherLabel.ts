/**
 * lesson_update 알림 본문의 "OOO 선생님" → "OOOT" 일괄 변환 (1회성)
 * 실행: npm run build && npm run migrate:lesson-notification-label
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { dbConfig } from '../config';

dotenv.config();

const TEACHER_SUFFIX_PATTERN = / · ([^·]+?) 선생님$/;

async function main() {
  const uri = process.env.MONGODB_URI ?? dbConfig.uri;
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('notifications');

  const docs = await col.find({ type: 'lesson_update', body: / 선생님$/ }).toArray();
  let updated = 0;

  for (const doc of docs) {
    const body = typeof doc.body === 'string' ? doc.body : '';
    if (!body || !TEACHER_SUFFIX_PATTERN.test(body)) continue;
    const newBody = body.replace(TEACHER_SUFFIX_PATTERN, ' · $1T');
    if (newBody === body) continue;
    await col.updateOne({ _id: doc._id }, { $set: { body: newBody } });
    updated += 1;
  }

  console.log(`[migrate] lesson_update notifications updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
