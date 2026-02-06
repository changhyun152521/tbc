import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../models/User.model';
import { IUser } from '../models/User.model';

const SALT_ROUNDS = 10;

/** passwordHash 제외한 공개 정보 */
export interface MeProfile {
  id: string;
  role: string;
  name: string;
  loginId: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

function toMeProfile(user: IUser): MeProfile {
  return {
    id: user._id.toString(),
    role: user.role,
    name: user.name,
    loginId: user.loginId,
    phone: user.phone ?? '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getMe(userId: string): Promise<MeProfile | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId).select('-passwordHash').exec();
  if (!user) return null;
  return toMeProfile(user);
}

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; message?: string }> {
  const user = await User.findById(userId).exec();
  if (!user) return { ok: false, message: '사용자를 찾을 수 없습니다.' };

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return { ok: false, message: '현재 비밀번호가 일치하지 않습니다.' };

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
  return { ok: true };
}

export async function updateLoginId(userId: string, newLoginId: string): Promise<{ ok: boolean; message?: string }> {
  const trimmed = newLoginId.trim();
  if (!trimmed) return { ok: false, message: '새 로그인 ID를 입력해 주세요.' };

  const existing = await User.findOne({ loginId: trimmed }).exec();
  if (existing && existing._id.toString() !== userId) {
    return { ok: false, message: '이미 사용 중인 로그인 ID입니다.' };
  }

  const user = await User.findById(userId).exec();
  if (!user) return { ok: false, message: '사용자를 찾을 수 없습니다.' };

  user.loginId = trimmed;
  await user.save();
  return { ok: true };
}

export async function updatePhone(userId: string, newPhone: string): Promise<{ ok: boolean; message?: string }> {
  const user = await User.findById(userId).exec();
  if (!user) return { ok: false, message: '사용자를 찾을 수 없습니다.' };

  user.phone = newPhone ?? '';
  await user.save();
  return { ok: true };
}
