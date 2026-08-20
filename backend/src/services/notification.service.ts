import mongoose from 'mongoose';
import { Notification } from '../models/Notification.model';
import type { NotificationType } from '../models/Notification.model';
import { Class } from '../models/Class.model';
import { LessonDay } from '../models/LessonDay.model';
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

async function getReplyRecipientUserIds(classId: string, teacherId?: string | null): Promise<string[]> {
  if (!mongoose.Types.ObjectId.isValid(classId)) return [];
  const [targetTeacher, admins] = await Promise.all([
    teacherId && mongoose.Types.ObjectId.isValid(teacherId)
      ? Teacher.findById(teacherId).select('userId').lean().exec()
      : null,
    User.find({ role: 'admin' }).select('_id').lean().exec(),
  ]);

  return uniqStrings([
    targetTeacher?.userId?.toString() ?? '',
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

type NotificationRow = {
  _id: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  readAt?: Date | null;
  createdAt: Date;
};

async function filterNotificationsForTeacher(userId: string, rows: NotificationRow[]): Promise<NotificationRow[]> {
  if (!mongoose.Types.ObjectId.isValid(userId) || rows.length === 0) return rows;
  const teacher = await Teacher.findOne({ userId: new mongoose.Types.ObjectId(userId) }).select('_id').lean().exec();
  if (!teacher) return rows;

  const classScopedRows = rows.filter((row) => row.type === 'lesson_update' || row.type === 'test_created');
  const classIds = uniqStrings(
    classScopedRows.map((row) => (typeof row.payload?.classId === 'string' ? row.payload.classId : ''))
  ).filter((id) => mongoose.Types.ObjectId.isValid(id));

  let allowedClassIds = new Set<string>();
  if (classIds.length > 0) {
    const classes = await Class.find({
      _id: { $in: classIds.map((id) => new mongoose.Types.ObjectId(id)) },
      teacherIds: teacher._id,
    })
      .select('_id')
      .lean()
      .exec();
    allowedClassIds = new Set(classes.map((c) => c._id.toString()));
  }

  const replyRows = rows.filter((row) => row.type === 'student_reply' || row.type === 'parent_reply');
  const lessonDayIds = uniqStrings(
    replyRows.map((row) => {
      const lessonDayId = row.payload?.lessonDayId;
      return typeof lessonDayId === 'string' ? lessonDayId : '';
    })
  ).filter((id) => mongoose.Types.ObjectId.isValid(id));

  const ownsPeriod = new Set<string>();
  if (lessonDayIds.length > 0) {
    const lessonDays = await LessonDay.find({ _id: { $in: lessonDayIds.map((id) => new mongoose.Types.ObjectId(id)) } })
      .select('periods')
      .lean()
      .exec();

    for (const day of lessonDays) {
      for (const period of day.periods ?? []) {
        if (period.teacherId?.toString() !== teacher._id.toString() || !period._id) continue;
        ownsPeriod.add(`${day._id.toString()}:${period._id.toString()}`);
      }
    }
  }

  return rows.filter((row) => {
    if (row.type === 'lesson_update' || row.type === 'test_created') {
      const classId = typeof row.payload?.classId === 'string' ? row.payload.classId : '';
      return Boolean(classId && allowedClassIds.has(classId));
    }
    if (row.type === 'student_reply' || row.type === 'parent_reply') {
      const lessonDayId = typeof row.payload?.lessonDayId === 'string' ? row.payload.lessonDayId : '';
      const periodId = typeof row.payload?.periodId === 'string' ? row.payload.periodId : '';
      if (!lessonDayId || !periodId) return false;
      return ownsPeriod.has(`${lessonDayId}:${periodId}`);
    }
    return true;
  });
}

function toNotificationDto(row: NotificationRow) {
  return {
    _id: row._id.toString(),
    type: row.type,
    title: row.title,
    body: row.body,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
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
  });
}

export async function notifyReply(params: {
  actorUserId?: string | null;
  classId: string;
  className: string;
  teacherId?: string | null;
  lessonDayId: string;
  periodId: string;
  periodNumber: number;
  date: string;
  studentId: string;
  studentName: string;
  body: string;
  channel: 'student' | 'parent';
}) {
  const recipientUserIds = await getReplyRecipientUserIds(params.classId, params.teacherId ?? null);
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

export async function notifyReplyLike(params: {
  actorUserId?: string | null;
  recipientUserId: string;
  classId: string;
  className: string;
  lessonDayId: string;
  periodId: string;
  periodNumber: number;
  date: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  replyPreview: string;
  channel: 'student' | 'parent';
}) {
  if (!mongoose.Types.ObjectId.isValid(params.recipientUserId)) return;
  await createForRecipients([params.recipientUserId], {
    type: 'reply_like',
    title: '답글 좋아요',
    body: `${params.teacherName} 선생님이 회원님의 답글에 좋아요를 눌렀습니다.`,
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
      replyPreview: clipText(params.replyPreview),
      teacherName: params.teacherName,
    },
    excludeUserId: params.actorUserId ?? null,
  });
}

/** 답글 삭제 시 관련 알림(답글 도착·좋아요) 정리 */
export async function deleteNotificationsForReply(params: {
  lessonDayId: string;
  periodId: string;
  studentId: string;
  channel: 'student' | 'parent';
  recipientUserId?: string | null;
}) {
  const replyType: NotificationType = params.channel === 'student' ? 'student_reply' : 'parent_reply';
  await Notification.deleteMany({
    $or: [
      {
        type: replyType,
        'payload.lessonDayId': params.lessonDayId,
        'payload.periodId': params.periodId,
        'payload.studentId': params.studentId,
      },
      {
        type: 'reply_like',
        'payload.lessonDayId': params.lessonDayId,
        'payload.periodId': params.periodId,
        'payload.channel': params.channel,
        ...(params.recipientUserId && mongoose.Types.ObjectId.isValid(params.recipientUserId)
          ? { recipientUserId: new mongoose.Types.ObjectId(params.recipientUserId) }
          : { 'payload.studentId': params.studentId }),
      },
    ],
  }).exec();
}

type ReplyInboxChannel = 'student' | 'parent';

export async function listReplyInboxForUser(
  userId: string,
  role: string,
  options: { page?: number; limit?: number } = {}
) {
  const page = Math.max(Number(options.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(options.limit ?? 5), 1), 20);
  const teacher = role === 'teacher' && mongoose.Types.ObjectId.isValid(userId)
    ? await Teacher.findOne({ userId: new mongoose.Types.ObjectId(userId) }).select('_id name').lean().exec()
    : null;
  if (role !== 'admin' && !teacher) {
    return { items: [], total: 0, page, limit };
  }

  const classFilter =
    role === 'admin' ? {} : { teacherIds: new mongoose.Types.ObjectId(teacher!._id) };
  const classes = await Class.find(classFilter).select('_id name').lean().exec();
  const classIds = classes.map((c) => c._id as mongoose.Types.ObjectId);
  if (classIds.length === 0) return { items: [], total: 0, page, limit };

  const lessons = await LessonDay.find({ classId: { $in: classIds } })
    .populate('periods.teacherId', 'name')
    .sort({ date: -1 })
    .lean()
    .exec();

  const classNameById = new Map(classes.map((c) => [c._id.toString(), c.name]));
  const teacherIds = new Set<string>();
  type InboxItem = {
    key: string;
    classId: string;
    className: string;
    lessonDayId: string;
    periodId: string;
    periodNumber: number;
    date: string;
    studentId: string;
    studentName: string;
    channel: ReplyInboxChannel;
    replyBody: string;
    replyCreatedAt?: string;
    replyUpdatedAt?: string;
    likedTeacherIds: string[];
  };
  const rawItems: InboxItem[] = [];

  for (const lesson of lessons) {
    for (let idx = 0; idx < (lesson.periods ?? []).length; idx += 1) {
      const period = lesson.periods[idx];
      const rawTeacherId = period.teacherId as mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId } | undefined;
      const periodTeacherId =
        typeof rawTeacherId === 'object' && rawTeacherId !== null && '_id' in rawTeacherId
          ? rawTeacherId._id?.toString() ?? ''
          : rawTeacherId?.toString() ?? '';
      if (role === 'teacher' && periodTeacherId !== teacher!._id.toString()) continue;
      if (periodTeacherId) teacherIds.add(periodTeacherId);
      const periodId = period._id?.toString() ?? '';
      if (!periodId) continue;
      for (const record of period.records ?? []) {
        const studentId = record.studentId?.toString() ?? '';
        if (!studentId) continue;
        if ((record.studentReply ?? '').trim()) {
          rawItems.push({
            key: `${lesson._id.toString()}:${periodId}:${studentId}:student`,
            classId: lesson.classId.toString(),
            className: classNameById.get(lesson.classId.toString()) ?? '',
            lessonDayId: lesson._id.toString(),
            periodId,
            periodNumber: period.periodNumber ?? idx + 1,
            date: lesson.date instanceof Date ? lesson.date.toISOString().slice(0, 10) : String(lesson.date).slice(0, 10),
            studentId,
            studentName: '',
            channel: 'student',
            replyBody: (record.studentReply ?? '').trim(),
            replyCreatedAt: record.studentReplyCreatedAt ? new Date(record.studentReplyCreatedAt).toISOString() : undefined,
            replyUpdatedAt: record.studentReplyUpdatedAt ? new Date(record.studentReplyUpdatedAt).toISOString() : undefined,
            likedTeacherIds: (record.studentReplyLikedTeacherIds ?? []).map((id) => id.toString()),
          });
        }
        if ((record.parentReply ?? '').trim()) {
          rawItems.push({
            key: `${lesson._id.toString()}:${periodId}:${studentId}:parent`,
            classId: lesson.classId.toString(),
            className: classNameById.get(lesson.classId.toString()) ?? '',
            lessonDayId: lesson._id.toString(),
            periodId,
            periodNumber: period.periodNumber ?? idx + 1,
            date: lesson.date instanceof Date ? lesson.date.toISOString().slice(0, 10) : String(lesson.date).slice(0, 10),
            studentId,
            studentName: '',
            channel: 'parent',
            replyBody: (record.parentReply ?? '').trim(),
            replyCreatedAt: record.parentReplyCreatedAt ? new Date(record.parentReplyCreatedAt).toISOString() : undefined,
            replyUpdatedAt: record.parentReplyUpdatedAt ? new Date(record.parentReplyUpdatedAt).toISOString() : undefined,
            likedTeacherIds: (record.parentReplyLikedTeacherIds ?? []).map((id) => id.toString()),
          });
        }
      }
    }
  }

  const [students, likedTeachers] = await Promise.all([
    Student.find({ _id: { $in: uniqStrings(rawItems.map((item) => item.studentId)).map((id) => new mongoose.Types.ObjectId(id)) } })
      .select('name')
      .lean()
      .exec(),
    teacherIds.size > 0 || rawItems.some((item) => item.likedTeacherIds.length > 0)
      ? Teacher.find({
          _id: {
            $in: uniqStrings([
              ...Array.from(teacherIds),
              ...rawItems.flatMap((item) => item.likedTeacherIds),
            ]).map((id) => new mongoose.Types.ObjectId(id)),
          },
        })
          .select('name')
          .lean()
          .exec()
      : [],
  ]);
  const studentNameById = new Map(students.map((student) => [student._id.toString(), student.name]));
  const teacherNameById = new Map(likedTeachers.map((row) => [row._id.toString(), row.name]));

  const items = rawItems
    .map((item) => ({
      ...item,
      studentName: studentNameById.get(item.studentId) ?? '-',
      likedByMe: teacher ? item.likedTeacherIds.includes(teacher._id.toString()) : false,
      likedTeacherNames: item.likedTeacherIds.map((id) => teacherNameById.get(id) ?? '').filter(Boolean),
    }))
    .sort((a, b) => (b.replyUpdatedAt ?? b.replyCreatedAt ?? '').localeCompare(a.replyUpdatedAt ?? a.replyCreatedAt ?? ''));

  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
  };
}

export async function toggleReplyLike(params: {
  actorUserId: string;
  lessonDayId: string;
  periodId: string;
  studentId: string;
  channel: ReplyInboxChannel;
}) {
  if (
    !mongoose.Types.ObjectId.isValid(params.actorUserId) ||
    !mongoose.Types.ObjectId.isValid(params.lessonDayId) ||
    !mongoose.Types.ObjectId.isValid(params.periodId) ||
    !mongoose.Types.ObjectId.isValid(params.studentId)
  ) {
    return { ok: false, message: '올바른 요청이 아닙니다.' };
  }
  const teacher = await Teacher.findOne({ userId: new mongoose.Types.ObjectId(params.actorUserId) }).select('_id name').lean().exec();
  if (!teacher) return { ok: false, message: '강사만 좋아요를 누를 수 있습니다.' };

  const lesson = await LessonDay.findById(params.lessonDayId).exec();
  if (!lesson) return { ok: false, message: '수업을 찾을 수 없습니다.' };
  const period = (lesson.periods ?? []).find((row) => row._id?.toString() === params.periodId);
  if (!period || period.teacherId?.toString() !== teacher._id.toString()) {
    return { ok: false, message: '해당 답글에 대한 권한이 없습니다.' };
  }
  const record = (period.records ?? []).find((row) => row.studentId?.toString() === params.studentId);
  if (!record) return { ok: false, message: '학생 기록을 찾을 수 없습니다.' };

  const likeField = params.channel === 'student' ? 'studentReplyLikedTeacherIds' : 'parentReplyLikedTeacherIds';
  const replyBody = params.channel === 'student' ? (record.studentReply ?? '').trim() : (record.parentReply ?? '').trim();
  if (!replyBody) return { ok: false, message: '답글이 없습니다.' };
  const likedIds = new Set((record[likeField] ?? []).map((id) => id.toString()));
  const teacherIdStr = teacher._id.toString();
  const nowLiked = !likedIds.has(teacherIdStr);
  if (nowLiked) likedIds.add(teacherIdStr);
  else likedIds.delete(teacherIdStr);
  record[likeField] = Array.from(likedIds).map((id) => new mongoose.Types.ObjectId(id)) as never;
  await lesson.save();

  const likedTeacherIds = Array.from(likedIds);
  let likedTeacherNames: string[] = [];
  if (likedTeacherIds.length > 0) {
    const likedTeachers = await Teacher.find({
      _id: { $in: likedTeacherIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select('name')
      .lean()
      .exec();
    likedTeacherNames = likedTeachers.map((row) => row.name);
  }

  if (nowLiked) {
    const [student, classDoc] = await Promise.all([
      Student.findById(params.studentId).select('name userId parentUserId').lean().exec(),
      Class.findById(lesson.classId).select('name').lean().exec(),
    ]);
    const recipientUserId =
      params.channel === 'student' ? student?.userId?.toString() ?? '' : student?.parentUserId?.toString() ?? '';
    if (recipientUserId) {
      await notifyReplyLike({
        actorUserId: params.actorUserId,
        recipientUserId,
        classId: lesson.classId.toString(),
        className: classDoc?.name ?? '',
        lessonDayId: params.lessonDayId,
        periodId: params.periodId,
        periodNumber: period.periodNumber ?? 1,
        date: lesson.date instanceof Date ? lesson.date.toISOString().slice(0, 10) : String(lesson.date).slice(0, 10),
        studentId: params.studentId,
        studentName: student?.name ?? '-',
        teacherName: teacher.name,
        replyPreview: replyBody,
        channel: params.channel,
      });
    }
  }

  return {
    ok: true,
    data: {
      liked: nowLiked,
      likeCount: likedTeacherIds.length,
      likedTeacherNames,
    },
  };
}

const USER_BELL_TYPES: NotificationType[] = ['lesson_update', 'test_created', 'reply_like'];
const TEACHER_BELL_TYPES: NotificationType[] = ['lesson_update', 'test_created', 'student_reply', 'parent_reply'];
const ADMIN_BELL_TYPES: NotificationType[] = ['lesson_update', 'test_created', 'student_reply', 'parent_reply', 'reply_like'];

function resolveTypesForRole(role: string | undefined, requestedTypes?: NotificationType[]): NotificationType[] | undefined {
  if (role === 'student' || role === 'parent') {
    if (requestedTypes && requestedTypes.length > 0) {
      return requestedTypes.filter((t) => USER_BELL_TYPES.includes(t));
    }
    return USER_BELL_TYPES;
  }
  if (role === 'teacher') {
    if (requestedTypes && requestedTypes.length > 0) {
      return requestedTypes.filter((t) => TEACHER_BELL_TYPES.includes(t));
    }
    return TEACHER_BELL_TYPES;
  }
  if (role === 'admin') {
    if (requestedTypes && requestedTypes.length > 0) {
      return requestedTypes.filter((t) => ADMIN_BELL_TYPES.includes(t));
    }
    return ADMIN_BELL_TYPES;
  }
  if (requestedTypes && requestedTypes.length > 0) {
    return requestedTypes;
  }
  return undefined;
}

async function filterNotificationsForRole(userId: string, role: string | undefined, rows: NotificationRow[]): Promise<NotificationRow[]> {
  if (role === 'teacher') return filterNotificationsForTeacher(userId, rows);
  return rows;
}

export async function listNotificationsForUser(
  userId: string,
  options: { limit?: number; page?: number; types?: NotificationType[]; role?: string } = {}
) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { items: [], total: 0, page: 1, limit: options.limit ?? 20 };
  }
  const effectiveTypes = resolveTypesForRole(options.role, options.types);
  const q: Record<string, unknown> = { recipientUserId: new mongoose.Types.ObjectId(userId) };
  if (effectiveTypes && effectiveTypes.length > 0) q.type = { $in: effectiveTypes };
  const page = Math.max(Number(options.page ?? 1), 1);
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const rows = await Notification.find(q).sort({ createdAt: -1 }).limit(1000).lean().exec();
  const filteredRows = await filterNotificationsForRole(userId, options.role, rows as NotificationRow[]);
  const total = filteredRows.length;
  const start = (page - 1) * limit;
  const items = filteredRows.slice(start, start + limit).map(toNotificationDto);
  return { items, total, page, limit };
}

export async function getUnreadCount(userId: string, role?: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 0;
  const effectiveTypes = resolveTypesForRole(role);
  const q: Record<string, unknown> = {
    recipientUserId: new mongoose.Types.ObjectId(userId),
    readAt: null,
  };
  if (effectiveTypes && effectiveTypes.length > 0) q.type = { $in: effectiveTypes };
  const rows = await Notification.find(q)
    .sort({ createdAt: -1 })
    .limit(300)
    .lean()
    .exec();
  const filteredRows = await filterNotificationsForRole(userId, role, rows as NotificationRow[]);
  return filteredRows.length;
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
