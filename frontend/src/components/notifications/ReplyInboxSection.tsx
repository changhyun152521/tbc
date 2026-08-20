import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';

interface ReplyNotificationItem {
  _id: string;
  type: 'student_reply' | 'parent_reply';
  title: string;
  body: string;
  payload?: {
    classId?: string;
    className?: string;
    date?: string;
    periodNumber?: number;
  };
  readAt?: string | null;
  createdAt: string;
}

function formatDateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function ReplyInboxSection() {
  const [items, setItems] = useState<ReplyNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<{ success: boolean; data?: ReplyNotificationItem[] }>('/me/notifications?types=student_reply,parent_reply&limit=8')
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && Array.isArray(res.data.data)) setItems(res.data.data);
        else setItems([]);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h3 className="text-[12px] sm:text-[14px] font-black text-slate-400 uppercase tracking-widest mb-4 sm:mb-5 ml-1 sm:ml-2">
        답글 목록
      </h3>
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">아직 확인할 답글이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const classId = item.payload?.classId;
              return (
                <li key={item._id}>
                  <Link
                    to={classId ? `/admin/lessons/classroom/${classId}` : '/admin/lessons'}
                    className="block px-4 py-4 sm:px-5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.readAt ? 'bg-slate-200' : 'bg-sky-500'}`} />
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-700 break-words">{item.body}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.payload?.className ?? ''}{item.payload?.date ? ` · ${item.payload.date}` : ''}{item.payload?.periodNumber ? ` · ${item.payload.periodNumber}교시` : ''}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">{formatDateLabel(item.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
