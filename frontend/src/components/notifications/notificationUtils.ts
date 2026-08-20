export type NotificationType =
  | 'lesson_update'
  | 'test_created'
  | 'student_reply'
  | 'parent_reply'
  | 'reply_like'
  | 'announcement_created';

export interface NotificationItem {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: {
    classId?: string;
    className?: string;
    lessonDayId?: string;
    periodId?: string;
    periodNumber?: number;
    date?: string;
    testId?: string;
    announcementId?: string;
    teacherName?: string;
  };
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export function formatNotificationTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function withQuery(path: string, params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}

/** 알림 클릭 시 해당 일자·교시(또는 시험/공지)로 이동 */
export function notificationTargetPath(role: string | null, item: NotificationItem): string {
  const classId = item.payload?.classId;
  const date = item.payload?.date;
  const period = item.payload?.periodNumber;
  const testId = item.payload?.testId;

  if (role === 'student' || role === 'parent') {
    if (item.type === 'test_created') {
      return withQuery('/student/tests', { date, classId });
    }
    if (item.type === 'reply_like' || item.type === 'lesson_update') {
      return withQuery('/student/lessons', { date, period, classId });
    }
    return '/student/lessons';
  }

  if (item.type === 'announcement_created') {
    return classId ? withQuery(`/admin/classes/${classId}`, { tab: 'announcements' }) : '/admin/dashboard';
  }

  if (item.type === 'test_created') {
    return classId
      ? withQuery(`/admin/tests/classroom/${classId}`, { date, testId })
      : '/admin/tests';
  }

  // lesson_update, student_reply, parent_reply, reply_like(관리자)
  if (classId) {
    return withQuery(`/admin/lessons/classroom/${classId}`, { date, period });
  }
  return '/admin/dashboard';
}
