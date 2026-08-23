import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../models/User.model';
import { IUser } from '../models/User.model';
import { Student } from '../models/Student.model';
import { Teacher } from '../models/Teacher.model';

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
  /** 학생 역할일 때, 관리 접속 계정으로 로그인한 경우 true */
  isAdminAccess?: boolean;
  /** 강사 역할일 때 Teacher 문서 ID */
  teacherId?: string;
  /** true이면 로그인 후 비밀번호 변경 유도 */
  mustChangePassword?: boolean;
}

function toMeProfile(user: IUser, isAdminAccess?: boolean): MeProfile {
  const profile: MeProfile = {
    id: user._id.toString(),
    role: user.role,
    name: user.name,
    loginId: user.loginId,
    phone: user.phone ?? '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  if (isAdminAccess === true) profile.isAdminAccess = true;
  if (user.mustChangePassword === true) profile.mustChangePassword = true;
  return profile;
}

export async function getMe(userId: string): Promise<MeProfile | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId).select('-passwordHash').exec();
  if (!user) return null;
  let isAdminAccess = false;
  if (user.role === 'student') {
    const asAdmin = await Student.findOne({ adminAccessUserId: user._id }).select('_id').lean().exec();
    isAdminAccess = !!asAdmin;
  }
  const profile = toMeProfile(user, isAdminAccess);
  if (user.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: user._id }).select('_id').lean().exec();
    if (teacher) profile.teacherId = teacher._id.toString();
  }
  return profile;
}

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; message?: string }> {
  const user = await User.findById(userId).exec();
  if (!user) return { ok: false, message: '사용자를 찾을 수 없습니다.' };

  if (user.mustChangePassword === true && (user.role === 'student' || user.role === 'parent')) {
    return {
      ok: false,
      message: '첫 로그인 설정에서는 아이디와 비밀번호를 함께 변경해 주세요.',
    };
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return { ok: false, message: '현재 비밀번호가 일치하지 않습니다.' };

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.mustChangePassword = false;
  await user.save();
  return { ok: true };
}

/**
 * 학생·학부모 첫 로그인: 아이디 + 비밀번호를 한 번에 변경하고 mustChangePassword 해제
 */
export async function completeInitialCredentials(
  userId: string,
  input: { currentPassword: string; newPassword: string; newLoginId: string }
): Promise<{ ok: boolean; message?: string; loginId?: string }> {
  const user = await User.findById(userId).exec();
  if (!user) return { ok: false, message: '사용자를 찾을 수 없습니다.' };
  if (user.role !== 'student' && user.role !== 'parent') {
    return { ok: false, message: '학생·학부모 계정만 이용할 수 있습니다.' };
  }
  if (user.mustChangePassword !== true) {
    return { ok: false, message: '이미 초기 설정이 완료된 계정입니다.' };
  }

  const newLoginId = input.newLoginId.trim();
  const newPassword = input.newPassword.trim();
  const currentPassword = input.currentPassword;
  if (!newLoginId) return { ok: false, message: '새 로그인 ID를 입력해 주세요.' };
  if (!newPassword) return { ok: false, message: '새 비밀번호를 입력해 주세요.' };
  if (newLoginId === user.loginId) {
    return { ok: false, message: '현재 로그인 ID와 다른 ID로 변경해 주세요.' };
  }
  if (newPassword === currentPassword) {
    return { ok: false, message: '현재 비밀번호와 다른 비밀번호로 변경해 주세요.' };
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return { ok: false, message: '현재 비밀번호가 일치하지 않습니다.' };

  const existing = await User.findOne({ loginId: newLoginId }).exec();
  if (existing && existing._id.toString() !== userId) {
    return { ok: false, message: '이미 사용 중인 로그인 ID입니다.' };
  }

  user.loginId = newLoginId;
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.mustChangePassword = false;
  await user.save();
  return { ok: true, loginId: newLoginId };
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
