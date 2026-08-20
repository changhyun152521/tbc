import mongoose from 'mongoose';
import { User } from '../models/User.model';
import { Student } from '../models/Student.model';

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const lastTouchByUser = new Map<string, number>();

/** 관리자 접속용(이름admin) 계정은 학생 본인 접속으로 집계하지 않음 */
export async function isAdminAccessUser(userId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return false;
  const exists = await Student.exists({ adminAccessUserId: userId }).exec();
  return Boolean(exists);
}

export async function touchLastAccess(userId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return;
  if (await isAdminAccessUser(userId)) return;
  await User.findByIdAndUpdate(userId, { lastAccessAt: new Date() }).exec();
}

/** 인증된 API 요청마다 호출 — 5분 간격으로만 DB 갱신 */
export function touchLastAccessIfNeeded(userId: string): void {
  const now = Date.now();
  const last = lastTouchByUser.get(userId) ?? 0;
  if (now - last < TOUCH_INTERVAL_MS) return;
  lastTouchByUser.set(userId, now);
  void touchLastAccess(userId);
}
