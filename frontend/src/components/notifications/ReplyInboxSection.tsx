import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import Pagination from '../ui/Pagination';
import { formatNotificationTime, type NotificationItem, type NotificationListResponse } from './notificationUtils';

const REPLY_PAGE_SIZE = 5;

export default function ReplyInboxSection() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / REPLY_PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<{ success: boolean; data?: NotificationListResponse }>(
        `/me/notifications?types=student_reply,parent_reply&limit=${REPLY_PAGE_SIZE}&page=${page}`
      )
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.data) {
          setItems(res.data.data.items ?? []);
          setTotal(res.data.data.total ?? 0);
        } else {
          setItems([]);
          setTotal(0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

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
                          {item.payload?.className ?? ''}
                          {item.payload?.date ? ` · ${item.payload.date}` : ''}
                          {item.payload?.periodNumber ? ` · ${item.payload.periodNumber}교시` : ''}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">{formatNotificationTime(item.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && total > 0 && (
          <div className="px-4 pb-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
