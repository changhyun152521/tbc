import { useState, useEffect, FormEvent } from 'react';
import { apiClient } from '../../api/client';
import { extractYoutubeVideoId } from '../../utils/youtube';

export interface QuestionVideoItem {
  _id: string;
  url: string;
  videoId: string;
  title: string;
  teacherId: string | null;
  teacherName: string;
  createdAt: string;
  maxPercent?: number;
  watchedSec?: number;
  playTimeSec?: number;
  durationSec?: number;
  lastWatchedAt?: string | null;
  canDelete: boolean;
}

interface QuestionVideoManageModalProps {
  open: boolean;
  studentId: string;
  studentName: string;
  /** 강사/관리자 등록 가능 */
  canCreate: boolean;
  onClose: () => void;
}

const DISPLAY_COMPLETE_PERCENT = 80;

function formatDate(d: string): string {
  try {
    const date = new Date(d);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d.slice(0, 10);
  }
}

function formatWatchTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}시간 ${m % 60}분 ${r}초`;
  }
  if (m > 0) return `${m}분 ${r}초`;
  return `${r}초`;
}

function progressLabel(maxPercent: number): string {
  if (maxPercent >= DISPLAY_COMPLETE_PERCENT) return '진행완료';
  return `진행률 ${Math.round(maxPercent)}%`;
}

export default function QuestionVideoManageModal({
  open,
  studentId,
  studentName,
  canCreate,
  onClose,
}: QuestionVideoManageModalProps) {
  const [items, setItems] = useState<QuestionVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ success: boolean; data: QuestionVideoItem[]; message?: string }>(
        `/admin/students/${studentId}/question-videos`
      );
      if (res.data.success && Array.isArray(res.data.data)) {
        setItems(res.data.data);
      } else {
        setItems([]);
        setError(res.data.message ?? '목록을 불러오지 못했습니다.');
      }
    } catch (err: unknown) {
      const msg =
        typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : '목록을 불러오지 못했습니다.';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setUrl('');
    setTitle('');
    setError('');
    void fetchList();
  }, [open, studentId]);

  if (!open) return null;

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      setError('올바른 유튜브 URL 또는 영상 ID를 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.post<{ success: boolean; data: QuestionVideoItem; message?: string }>(
        `/admin/students/${studentId}/question-videos`,
        { url: url.trim(), title: title.trim() }
      );
      if (res.data.success && res.data.data) {
        setItems((prev) => [res.data.data, ...prev]);
        setUrl('');
        setTitle('');
      } else {
        setError(res.data.message ?? '등록에 실패했습니다.');
      }
    } catch (err: unknown) {
      const msg =
        typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : '등록에 실패했습니다.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!window.confirm('이 질문 영상을 삭제할까요?')) return;
    setDeletingId(videoId);
    setError('');
    try {
      const res = await apiClient.delete<{ success: boolean; message?: string }>(
        `/admin/students/${studentId}/question-videos/${videoId}`
      );
      if (res.data.success) {
        setItems((prev) => prev.filter((x) => x._id !== videoId));
      } else {
        setError(res.data.message ?? '삭제에 실패했습니다.');
      }
    } catch (err: unknown) {
      const msg =
        typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : '삭제에 실패했습니다.';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div
        className="flex flex-col max-h-[85vh] w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-950">질문 영상</h2>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{studentName}</span> 학생 전용
            {canCreate
              ? ' · 강사는 본인 등록분만, 관리자는 전체 영상을 관리합니다'
              : ''}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          {canCreate && (
            <form onSubmit={(e) => void handleAdd(e)} className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">새 영상 등록</p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="영상 제목 (선택)"
                className={inputClass}
              />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={inputClass}
                required
              />
              <button
                type="submit"
                disabled={saving || !url.trim()}
                className="w-full py-2.5 bg-slate-950 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? '등록 중…' : '유튜브 영상 등록'}
              </button>
            </form>
          )}

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight mb-2">등록된 영상</p>
            {loading ? (
              <p className="text-sm text-slate-400 py-2">로딩 중...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">등록된 질문 영상이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => {
                  const pct = item.maxPercent ?? 0;
                  const done = pct >= DISPLAY_COMPLETE_PERCENT;
                  const watched = item.watchedSec ?? 0;
                  const playTime = item.playTimeSec ?? 0;
                  const duration = item.durationSec ?? 0;
                  return (
                  <li
                    key={item._id}
                    className="flex items-start gap-2 p-3 rounded-xl border border-slate-100 bg-white"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.title || '질문 영상'}
                        </p>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                            done ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                          }`}
                        >
                          {progressLabel(pct)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.teacherName ? `${item.teacherName} 선생님 · ` : ''}
                        {formatDate(item.createdAt)}
                      </p>
                      <p className="text-[12px] text-slate-600 mt-1.5">
                        시청시간 {formatWatchTime(watched)}
                        {duration > 0 ? ` / ${formatWatchTime(duration)}` : ''}
                        {playTime > 0 && playTime !== watched
                          ? ` · 재생누적 ${formatWatchTime(playTime)}`
                          : ''}
                      </p>
                      {item.lastWatchedAt && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          최근 시청 {formatDate(item.lastWatchedAt)}
                        </p>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-sky-700 hover:underline break-all mt-1 inline-block"
                      >
                        {item.url}
                      </a>
                    </div>
                    {item.canDelete && (
                      <button
                        type="button"
                        disabled={deletingId === item._id}
                        onClick={() => void handleDelete(item._id)}
                        className="text-red-400 hover:text-red-600 text-sm shrink-0 disabled:opacity-50"
                      >
                        {deletingId === item._id ? '…' : '삭제'}
                      </button>
                    )}
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="shrink-0 p-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
