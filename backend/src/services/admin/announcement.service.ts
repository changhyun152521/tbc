import mongoose from 'mongoose';
import { Announcement } from '../../models/Announcement.model';
import { AnnouncementDismissal } from '../../models/AnnouncementDismissal.model';
import { Class } from '../../models/Class.model';
import { isYyyyMmDd, kstToday } from '../../utils/dateKst';

export interface AnnouncementInput {
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

export async function listByClass(classId: string) {
  if (!mongoose.Types.ObjectId.isValid(classId)) return [];
  return Announcement.find({ classId: new mongoose.Types.ObjectId(classId) })
    .sort({ startsAt: -1, createdAt: -1 })
    .lean()
    .exec();
}

export async function createAnnouncement(classId: string, input: AnnouncementInput, createdBy?: string) {
  if (!mongoose.Types.ObjectId.isValid(classId)) return { error: '올바른 반 ID가 아닙니다.' };
  const classDoc = await Class.findById(classId).select('_id').lean().exec();
  if (!classDoc) return { error: '반을 찾을 수 없습니다.' };
  const rangeErr = assertDateRange(input.startsAt, input.endsAt);
  if (rangeErr) return { error: rangeErr };
  const doc = await Announcement.create({
    classId: new mongoose.Types.ObjectId(classId),
    title: input.title.trim(),
    body: input.body.trim(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive !== false,
    createdBy: createdBy && mongoose.Types.ObjectId.isValid(createdBy) ? new mongoose.Types.ObjectId(createdBy) : undefined,
  });
  return { data: doc };
}

export async function updateAnnouncement(id: string, input: Partial<AnnouncementInput>) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: '올바른 ID가 아닙니다.' };
  const doc = await Announcement.findById(id).exec();
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
  const result = await Announcement.findByIdAndDelete(id).exec();
  if (result) {
    await AnnouncementDismissal.deleteMany({ announcementId: result._id }).exec();
  }
  return result != null;
}

export async function getAnnouncementClassId(id: string): Promise<string | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await Announcement.findById(id).select('classId').lean().exec();
  return doc?.classId?.toString() ?? null;
}

export async function getActiveForStudent(studentClassIds: mongoose.Types.ObjectId[], userId: string) {
  if (studentClassIds.length === 0) return [];
  const today = kstToday();
  const list = await Announcement.find({
    classId: { $in: studentClassIds },
    isActive: true,
    startsAt: { $lte: today },
    endsAt: { $gte: today },
  })
    .populate('classId', 'name')
    .sort({ startsAt: -1, createdAt: -1 })
    .lean()
    .exec();

  if (list.length === 0) return [];
  const ids = list.map((a) => a._id);
  const dismissals = await AnnouncementDismissal.find({
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
    .map((a) => {
      const cls = a.classId as unknown as { _id: mongoose.Types.ObjectId; name?: string } | mongoose.Types.ObjectId;
      const className = typeof cls === 'object' && cls && 'name' in cls ? cls.name ?? '' : '';
      const classId =
        typeof cls === 'object' && cls && '_id' in cls ? cls._id.toString() : String(a.classId);
      return {
        _id: a._id,
        classId,
        className,
        title: a.title,
        body: a.body,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
      };
    });
}

export async function dismissAnnouncement(userId: string, announcementId: string, hideUntil: string) {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(announcementId)) {
    return { error: '올바른 ID가 아닙니다.' };
  }
  if (!isYyyyMmDd(hideUntil)) return { error: 'hideUntil은 YYYY-MM-DD 형식이어야 합니다.' };
  const exists = await Announcement.findById(announcementId).select('_id').lean().exec();
  if (!exists) return { error: '공지를 찾을 수 없습니다.' };
  await AnnouncementDismissal.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId), announcementId: new mongoose.Types.ObjectId(announcementId) },
    { hideUntil },
    { upsert: true, new: true }
  ).exec();
  return { ok: true };
}
