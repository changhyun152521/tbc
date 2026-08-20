import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

type NotificationType = 'lesson_update' | 'test_created' | 'student_reply' | 'parent_reply';

interface NotificationItem {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: {
    classId?: string;
    lessonDayId?: string;
    periodId?: string;
  };
  readAt?: string | null;
  createdAt: string;
}

function formatTimeLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function targetPath(role: string | null, item: NotificationItem): string {
  const classId = item.payload?.classId;
  if (role === 'student' || role === 'parent') {
    return item.type === 'test_created' ? '/student/tests' : '/student/lessons';
  }
  if (item.type === 'test_created') {
    return classId ? `/admin/tests/classroom/${classId}` : '/admin/tests';
  }
  return classId ? `/admin/lessons/classroom/${classId}` : '/admin/dashboard';
}

export default function NotificationBell() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadItems = useMemo(() => items.filter((item) => !item.readAt), [items]);

  const fetchCount = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data?: { count?: number } }>('/me/notifications/unread-count');
      if (res.data.success) setCount(Number(res.data.data?.count ?? 0));
    } catch {
      setCount(0);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data?: NotificationItem[] }>('/me/notifications?limit=20');
      if (res.data.success && Array.isArray(res.data.data)) setItems(res.data.data);
      else setItems([]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCount();
    const timer = window.setInterval(() => {
      void fetchCount();
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setOpen(false);
    void fetchCount();
  }, [location.pathname]);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await fetchItems();
      await fetchCount();
    }
  };

  const handleRead = async (item: NotificationItem) => {
    try {
      if (!item.readAt) {
        await apiClient.post(`/me/notifications/${item._id}/read`);
      }
    } catch {
      // ignore
    }
    setItems((prev) => prev.map((row) => (row._id === item._id ? { ...row, readAt: new Date().toISOString() } : row)));
    setCount((prev) => Math.max(0, prev - (item.readAt ? 0 : 1)));
    setOpen(false);
    navigate(targetPath(role, item));
  };

  const handleReadAll = async () => {
    try {
      await apiClient.post('/me/notifications/read-all');
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleOpen()}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="알림"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/20 sm:bg-transparent"
            onClick={() => setOpen(false)}
            aria-label="알림 닫기"
          />
          <div className="fixed inset-x-0 bottom-0 z-40 sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[360px]">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[75vh] sm:max-h-[520px]">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">알림</p>
                  <p className="text-xs text-slate-400">새 소식과 답글을 확인하세요.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleReadAll()}
                  disabled={unreadItems.length === 0}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-40"
                >
                  모두 읽음
                </button>
              </div>
              <div className="overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-sm text-slate-400">불러오는 중...</div>
                ) : items.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">새 알림이 없습니다.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <li key={item._id}>
                        <button
                          type="button"
                          onClick={() => void handleRead(item)}
                          className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 ${
                            item.readAt ? 'bg-white' : 'bg-sky-50/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${item.readAt ? 'bg-slate-200' : 'bg-sky-500'}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <span className="text-[11px] text-slate-400 shrink-0">{formatTimeLabel(item.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-sm text-slate-600 break-words">{item.body}</p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
