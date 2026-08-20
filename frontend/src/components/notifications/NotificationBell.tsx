import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../ui/Pagination';
import {
  formatNotificationTime,
  notificationTargetPath,
  type NotificationItem,
  type NotificationListResponse,
} from './notificationUtils';

const DROPDOWN_LIMIT = 5;
const MODAL_PAGE_SIZE = 10;

interface NotificationListModalProps {
  open: boolean;
  onClose: () => void;
  onItemRead: (item: NotificationItem) => void;
  onReadAll: () => void;
}

function NotificationListModal({ open, onClose, onItemRead, onReadAll }: NotificationListModalProps) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / MODAL_PAGE_SIZE));

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<{ success: boolean; data?: NotificationListResponse }>(
        `/me/notifications?limit=${MODAL_PAGE_SIZE}&page=${page}`
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
  }, [open, page]);

  const handleItemClick = async (item: NotificationItem) => {
    onItemRead(item);
    onClose();
    navigate(notificationTargetPath(role, item));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="notification-modal-title"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 id="notification-modal-title" className="text-lg font-bold text-slate-900">
              전체 알림
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">총 {total}건</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReadAll}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              모두 읽음
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="닫기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">불러오는 중...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">알림이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => void handleItemClick(item)}
                    className={`w-full text-left px-5 py-3.5 transition-colors hover:bg-slate-50 ${
                      item.readAt ? 'bg-white' : 'bg-sky-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${item.readAt ? 'bg-slate-200' : 'bg-sky-500'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <span className="text-[11px] text-slate-400 shrink-0">{formatNotificationTime(item.createdAt)}</span>
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

        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
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
      const res = await apiClient.get<{ success: boolean; data?: NotificationListResponse }>(
        `/me/notifications?limit=${DROPDOWN_LIMIT}&page=1`
      );
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items ?? []);
        setTotal(res.data.data.total ?? 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {
      setItems([]);
      setTotal(0);
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
    setModalOpen(false);
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

  const markItemRead = async (item: NotificationItem) => {
    try {
      if (!item.readAt) {
        await apiClient.post(`/me/notifications/${item._id}/read`);
      }
    } catch {
      // ignore
    }
    setItems((prev) => prev.map((row) => (row._id === item._id ? { ...row, readAt: new Date().toISOString() } : row)));
    setCount((prev) => Math.max(0, prev - (item.readAt ? 0 : 1)));
  };

  const handleRead = async (item: NotificationItem) => {
    await markItemRead(item);
    setOpen(false);
    navigate(notificationTargetPath(role, item));
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

  const handleOpenModal = () => {
    setOpen(false);
    setModalOpen(true);
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
          <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(360px,calc(100vw-1.5rem))]">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
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
              <div className="max-h-[min(320px,55vh)] overflow-y-auto">
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
                                <span className="text-[11px] text-slate-400 shrink-0">{formatNotificationTime(item.createdAt)}</span>
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
              {total > DROPDOWN_LIMIT && (
                <div className="px-4 py-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleOpenModal}
                    className="w-full py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    더보기
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <NotificationListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onItemRead={(item) => void markItemRead(item)}
        onReadAll={() => void handleReadAll()}
      />
    </div>
  );
}
