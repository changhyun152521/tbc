import mongoose from 'mongoose';
import { TeacherAnnouncement } from '../../models/TeacherAnnouncement.model';
import { TeacherAnnouncementDismissal } from '../../models/TeacherAnnouncementDismissal.model';
import { isYyyyMmDd, kstToday } from '../../utils/dateKst';

export interface TeacherAnnouncementInput {
  title: string;
  body: string;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
}

function assertDateRange(startsAt: string, endsAt: string): string | null {
  if (!isYyyyMmDd(startsAt) || !isYyyyMmDd(endsAt)) return '날짜는 YYYY-MM-DD 형식이어야 합니다.';
  if (startsAt > endsAt) return '시작일은 종료일보다 이후일 수 없습니다.';
  return null;
}

export async function listAll() {
  return TeacherAnnouncement.find()
    .sort({ startsAt: -1, createdAt: -1 })
    .lean()
    .exec();
}

export async function createAnnouncement(input: TeacherAnnouncementInput, createdBy?: string) {
  const rangeErr = assertDateRange(input.startsAt, input.endsAt);
  if (rangeErr) return { error: rangeErr };
  const doc = await TeacherAnnouncement.create({
    title: input.title.trim(),
    body: input.body.trim(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive !== false,
    createdBy:
      createdBy && mongoose.Types.ObjectId.isValid(createdBy)
        ? new mongoose.Types.ObjectId(createdBy)
        : undefined,
  });
  return { data: doc };
}

export async function updateAnnouncement(id: string, input: Partial<TeacherAnnouncementInput>) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: '올바른 ID가 아닙니다.' };
  const doc = await TeacherAnnouncement.findById(id).exec();
  if (!doc) return { error: '공지를 찾을 수 없습니다.' };
  if (input.title !== undefined) doc.title = input.title.trim();
  if (input.body !== undefined) doc.body = input.body.trim();
  if (input.startsAt !== undefined) doc.startsAt = input.startsAt;
  if (input.endsAt !== undefined) doc.endsAt = input.endsAt;
  if (input.isActive !== undefined) doc.isActive = input.isActive;
  const rangeErr = assertDateRange(doc.startsAt, doc.endsAt);
  if (rangeErr) return { error: rangeErr };
  await doc.save();
  return { data: doc };
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const result = await TeacherAnnouncement.findByIdAndDelete(id).exec();
  if (result) {
    await TeacherAnnouncementDismissal.deleteMany({ announcementId: result._id }).exec();
  }
  return result != null;
}

export async function getActiveForTeacher(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return [];
  const today = kstToday();
  const list = await TeacherAnnouncement.find({
    isActive: true,
    startsAt: { $lte: today },
    endsAt: { $gte: today },
  })
    .sort({ startsAt: -1, createdAt: -1 })
    .lean()
    .exec();

  if (list.length === 0) return [];
  const ids = list.map((a) => a._id);
  const dismissals = await TeacherAnnouncementDismissal.find({
    userId: new mongoose.Types.ObjectId(userId),
    announcementId: { $in: ids },
    hideUntil: { $gte: today },
  })
    .select('announcementId')
    .lean()
    .exec();
  const hidden = new Set(dismissals.map((d) => d.announcementId.toString()));

  return list
    .filter((a) => !hidden.has(a._id.toString()))
    .map((a) => ({
      _id: a._id,
      title: a.title,
      body: a.body,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
    }));
}

export async function dismissAnnouncement(userId: string, announcementId: string, hideUntil: string) {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(announcementId)) {
    return { error: '올바른 ID가 아닙니다.' };
  }
  if (!isYyyyMmDd(hideUntil)) return { error: 'hideUntil은 YYYY-MM-DD 형식이어야 합니다.' };
  const exists = await TeacherAnnouncement.findById(announcementId).select('_id').lean().exec();
  if (!exists) return { error: '공지를 찾을 수 없습니다.' };
  await TeacherAnnouncementDismissal.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      announcementId: new mongoose.Types.ObjectId(announcementId),
    },
    { hideUntil },
    { upsert: true, new: true }
  ).exec();
  return { ok: true };
}
