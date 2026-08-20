import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../ui/Pagination';
import { formatNotificationTime } from './notificationUtils';

const REPLY_PAGE_SIZE = 5;

interface ReplyInboxItem {
  key: string;
  classId: string;
  className: string;
  lessonDayId: string;
  periodId: string;
  periodNumber: number;
  date: string;
  studentId: string;
  studentName: string;
  channel: 'student' | 'parent';
  replyBody: string;
  replyCreatedAt?: string;
  replyUpdatedAt?: string;
  likedByMe: boolean;
  likeCount: number;
  likedTeacherNames: string[];
}

interface ReplyInboxResponse {
  items: ReplyInboxItem[];
  total: number;
  page: number;
  limit: number;
}

export default function ReplyInboxSection() {
  const { role } = useAuth();
  const [items, setItems] = useState<ReplyInboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [likingKey, setLikingKey] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / REPLY_PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<{ success: boolean; data?: ReplyInboxResponse }>(
        `/me/reply-inbox?limit=${REPLY_PAGE_SIZE}&page=${page}`
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

  const handleToggleLike = async (item: ReplyInboxItem) => {
    setLikingKey(item.key);
    try {
      const res = await apiClient.post<{ success: boolean; data?: { liked: boolean; likeCount: number; likedTeacherNames: string[] } }>(
        '/me/reply-inbox/like',
        {
          lessonDayId: item.lessonDayId,
          periodId: item.periodId,
          studentId: item.studentId,
          channel: item.channel,
        }
      );
      if (res.data.success && res.data.data) {
        setItems((prev) =>
          prev.map((row) =>
            row.key === item.key
              ? {
                  ...row,
                  likedByMe: res.data.data?.liked ?? row.likedByMe,
                  likeCount: res.data.data?.likeCount ?? row.likeCount,
                  likedTeacherNames: res.data.data?.likedTeacherNames ?? row.likedTeacherNames,
                }
              : row
          )
        );
      }
    } finally {
      setLikingKey(null);
    }
  };

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
              return (
                <li key={item.key}>
                  <div className="px-4 py-4 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={
                          item.classId
                            ? `/admin/lessons/classroom/${item.classId}?date=${encodeURIComponent(item.date)}&period=${item.periodNumber}`
                            : '/admin/lessons'
                        }
                        className="min-w-0 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-sky-500" />
                          <p className="text-sm font-semibold text-slate-900">
                            {item.channel === 'parent' ? '학부모 답글' : '학생 답글'}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-slate-700 break-words">{item.studentName}: {item.replyBody}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.className}
                          {item.date ? ` · ${item.date}` : ''}
                          {item.periodNumber ? ` · ${item.periodNumber}교시` : ''}
                        </p>
                        {item.replyUpdatedAt && item.replyCreatedAt && item.replyUpdatedAt !== item.replyCreatedAt && (
                          <p className="mt-1 text-[11px] text-slate-400">수정됨</p>
                        )}
                        {item.likedTeacherNames.length > 0 && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            좋아요 {item.likeCount} · {item.likedTeacherNames.join(', ')}
                          </p>
                        )}
                      </Link>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className="text-[11px] text-slate-400">
                          {formatNotificationTime(item.replyUpdatedAt ?? item.replyCreatedAt ?? '')}
                        </span>
                        {role === 'teacher' && (
                          <button
                            type="button"
                            onClick={() => void handleToggleLike(item)}
                            disabled={likingKey === item.key}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                              item.likedByMe
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {item.likedByMe ? '좋아요 취소' : '좋아요'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
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
