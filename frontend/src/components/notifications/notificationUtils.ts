export type NotificationType = 'lesson_update' | 'test_created' | 'student_reply' | 'parent_reply';

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

export function notificationTargetPath(role: string | null, item: NotificationItem): string {
  const classId = item.payload?.classId;
  if (role === 'student' || role === 'parent') {
    return item.type === 'test_created' ? '/student/tests' : '/student/lessons';
  }
  if (item.type === 'test_created') {
    return classId ? `/admin/tests/classroom/${classId}` : '/admin/tests';
  }
  return classId ? `/admin/lessons/classroom/${classId}` : '/admin/dashboard';
}
