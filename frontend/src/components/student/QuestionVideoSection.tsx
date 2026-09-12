import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export interface QuestionVideoListItem {
  _id: string;
  url: string;
  videoId: string;
  title: string;
  teacherName: string;
  createdAt: string;
  maxPercent?: number;
}

interface QuestionVideoSectionProps {
  enabled: boolean;
  blockVideoPlay?: boolean;
  videoBlockedMessage?: string;
}

const DISPLAY_COMPLETE_PERCENT = 80;
const DEFAULT_BLOCKED_MESSAGE =
  '질문 영상은 학생 본인 계정으로 로그인해야 시청할 수 있습니다.';

function formatDate(d: string): string {
  try {
    const date = new Date(d);
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const wd = date.toLocaleDateString('ko-KR', { weekday: 'short' });
    return `${m}. ${day} (${wd})`;
  } catch {
    return d.slice(0, 10);
  }
}

function progressLabel(maxPercent: number): string {
  if (maxPercent >= DISPLAY_COMPLETE_PERCENT) return '진행완료';
  return `진행률 ${Math.round(maxPercent)}%`;
}

export default function QuestionVideoSection({
  enabled,
  blockVideoPlay = false,
  videoBlockedMessage = DEFAULT_BLOCKED_MESSAGE,
}: QuestionVideoSectionProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<QuestionVideoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [videoBlockedOpen, setVideoBlockedOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setFetched(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFetched(false);
    apiClient
      .get<{ success: boolean; data: QuestionVideoListItem[] }>('/student/question-videos')
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.success && Array.isArray(res.data.data) ? res.data.data : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setFetched(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) return null;
  if (!fetched || loading || items.length === 0) return null;

  const openVideo = (item: QuestionVideoListItem) => {
    if (blockVideoPlay) {
      setVideoBlockedOpen(true);
      return;
    }
    navigate(`/student/question-videos/${item._id}`);
  };

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-[20px] p-4 sm:p-6 shadow-sm">
        <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2 text-sm sm:text-base">
          <span>🎥</span>
          질문 영상
        </h2>
        <p className="text-[11px] text-slate-400 mb-4 sm:mb-6">
          선생님께서 올려 주신 개인 질문 영상입니다. 탭하면 시청할 수 있습니다.
        </p>
        <ul className="space-y-2">
          {items.map((item) => {
            const pct = item.maxPercent ?? 0;
            const done = pct >= DISPLAY_COMPLETE_PERCENT;
            return (
              <li key={item._id}>
                <button
                  type="button"
                  onClick={() => openVideo(item)}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.title || '질문 영상'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.teacherName ? `${item.teacherName} 선생님 · ` : ''}
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                        done ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {progressLabel(pct)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {videoBlockedOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setVideoBlockedOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="question-video-blocked-title"
          >
            <h2 id="question-video-blocked-title" className="text-lg font-bold text-slate-950 mb-2">
              질문 영상 시청 안내
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">{videoBlockedMessage}</p>
            <button
              type="button"
              onClick={() => setVideoBlockedOpen(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
