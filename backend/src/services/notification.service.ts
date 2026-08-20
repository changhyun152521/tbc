import mongoose from 'mongoose';
import { Notification } from '../models/Notification.model';
import type { NotificationType } from '../models/Notification.model';
import { Class } from '../models/Class.model';
import { Student } from '../models/Student.model';
import { Teacher } from '../models/Teacher.model';
import { User } from '../models/User.model';

function clipText(input: string, max = 80): string {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function uniqStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

async function getClassRecipientUserIds(classId: string): Promise<string[]> {
  if (!mongoose.Types.ObjectId.isValid(classId)) return [];
  const classDoc = await Class.findById(classId).select('teacherIds studentIds').lean().exec();
  if (!classDoc) return [];

  const teacherIds = ((classDoc.teacherIds ?? []) as mongoose.Types.ObjectId[]).map((id) => id.toString());
  const studentIds = ((classDoc.studentIds ?? []) as mongoose.Types.ObjectId[]).map((id) => id.toString());

  const [teachers, students, admins] = await Promise.all([
    teacherIds.length > 0
      ? Teacher.find({ _id: { $in: teacherIds.map((id) => new mongoose.Types.ObjectId(id)) } })
          .select('userId')
          .lean()
          .exec()
      : [],
    studentIds.length > 0
      ? Student.find({ _id: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) } })
          .select('userId parentUserId')
          .lean()
          .exec()
      : [],
    User.find({ role: 'admin' }).select('_id').lean().exec(),
  ]);

  return uniqStrings([
    ...teachers.map((t) => t.userId?.toString() ?? ''),
    ...students.flatMap((s) => [s.userId?.toString() ?? '', s.parentUserId?.toString() ?? '']),
    ...admins.map((u) => u._id.toString()),
  ]);
}

async function createForRecipients(
  recipientUserIds: string[],
  input: {
    type: NotificationType;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
    excludeUserId?: string | null;
  }
) {
  const filtered = uniqStrings(recipientUserIds).filter((id) => id !== (input.excludeUserId ?? ''));
  if (filtered.length === 0) return;
  await Notification.insertMany(
    filtered.map((userId) => ({
      recipientUserId: new mongoose.Types.ObjectId(userId),
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload ?? {},
      readAt: null,
    }))
  );
}

export async function notifyLessonUpdate(params: {
  actorUserId?: string | null;
  classId: string;
  className: string;
  lessonDayId: string;
  periodId: string;
  periodNumber: number;
  date: string;
  hasMemoChange: boolean;
  hasHomeworkChange: boolean;
}) {
  if (!params.hasMemoChange && !params.hasHomeworkChange) return;
  const recipientUserIds = await getClassRecipientUserIds(params.classId);
  const label =
    params.hasMemoChange && params.hasHomeworkChange
      ? '진도/과제 업데이트'
      : params.hasMemoChange
        ? '진도 업데이트'
        : '과제 업데이트';
  await createForRecipients(recipientUserIds, {
    type: 'lesson_update',
    title: label,
    body: `${params.className} · ${params.date} · ${params.periodNumber}교시`,
    payload: {
      classId: params.classId,
      className: params.className,
      lessonDayId: params.lessonDayId,
      periodId: params.periodId,
      periodNumber: params.periodNumber,
      date: params.date,
    },
    excludeUserId: params.actorUserId ?? null,
  });
}

export async function notifyTestCreated(params: {
  actorUserId?: string | null;
  classId: string;
  className: string;
  testId: string;
  testType: string;
  date: string;
  subject?: string;
}) {
  const recipientUserIds = await getClassRecipientUserIds(params.classId);
  const subject = clipText(params.subject ?? '');
  await createForRecipients(recipientUserIds, {
    type: 'test_created',
    title: '새 테스트 등록',
    body: `${params.className} · ${subject || params.testType} · ${params.date}`,
    payload: {
      classId: params.classId,
      className: params.className,
      testId: params.testId,
      testType: params.testType,
      date: params.date,
      subject: params.subject ?? '',
    },
    excludeUserId: params.actorUserId ?? null,
  });
}

export async function notifyReply(params: {
  actorUserId?: string | null;
  classId: string;
  className: string;
  lessonDayId: string;
  periodId: string;
  periodNumber: number;
  date: string;
  studentId: string;
  studentName: string;
  body: string;
  channel: 'student' | 'parent';
}) {
  const recipientUserIds = await getClassRecipientUserIds(params.classId);
  const title = params.channel === 'student' ? '학생 답글' : '학부모 답글';
  await createForRecipients(recipientUserIds, {
    type: params.channel === 'student' ? 'student_reply' : 'parent_reply',
    title,
    body: `${params.studentName}: ${clipText(params.body)}`,
    payload: {
      classId: params.classId,
      className: params.className,
      lessonDayId: params.lessonDayId,
      periodId: params.periodId,
      periodNumber: params.periodNumber,
      date: params.date,
      studentId: params.studentId,
      studentName: params.studentName,
      channel: params.channel,
    },
    excludeUserId: params.actorUserId ?? null,
  });
}

export async function notifyTeacherComment(params: {
  actorUserId?: string | null;
  studentUserId?: string | null;
  parentUserId?: string | null;
  classId: string;
  className: string;
  lessonDayId: string;
  periodId: string;
  periodNumber: number;
  date: string;
  studentName: string;
  body: string;
  channel: 'student' | 'parent';
}) {
  const recipientUserIds = uniqStrings([
    params.channel === 'student' ? params.studentUserId ?? '' : '',
    params.channel === 'parent' ? params.parentUserId ?? '' : '',
  ]);
  if (recipientUserIds.length === 0) return;
  await createForRecipients(recipientUserIds, {
    type: params.channel === 'student' ? 'student_reply' : 'parent_reply',
    title: params.channel === 'student' ? '선생님 답변' : '학부모용 답변',
    body: `${params.studentName}: ${clipText(params.body)}`,
    payload: {
      classId: params.classId,
      className: params.className,
      lessonDayId: params.lessonDayId,
      periodId: params.periodId,
      periodNumber: params.periodNumber,
      date: params.date,
      studentName: params.studentName,
      channel: params.channel,
    },
    excludeUserId: params.actorUserId ?? null,
  });
}

export async function listNotificationsForUser(
  userId: string,
  options: { limit?: number; types?: NotificationType[] } = {}
) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return [];
  const q: Record<string, unknown> = { recipientUserId: new mongoose.Types.ObjectId(userId) };
  if (options.types && options.types.length > 0) q.type = { $in: options.types };
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const rows = await Notification.find(q).sort({ createdAt: -1 }).limit(limit).lean().exec();
  return rows.map((row) => ({
    _id: row._id.toString(),
    type: row.type,
    title: row.title,
    body: row.body,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getUnreadCount(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 0;
  return Notification.countDocuments({
    recipientUserId: new mongoose.Types.ObjectId(userId),
    readAt: null,
  }).exec();
}

export async function markNotificationRead(userId: string, notificationId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(notificationId)) return false;
  const result = await Notification.updateOne(
    {
      _id: new mongoose.Types.ObjectId(notificationId),
      recipientUserId: new mongoose.Types.ObjectId(userId),
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  ).exec();
  return result.modifiedCount > 0;
}

export async function markAllNotificationsRead(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 0;
  const result = await Notification.updateMany(
    { recipientUserId: new mongoose.Types.ObjectId(userId), readAt: null },
    { $set: { readAt: new Date() } }
  ).exec();
  return result.modifiedCount ?? 0;
}
