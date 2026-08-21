import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

interface ActiveAnnouncement {
  _id: string;
  className: string;
  title: string;
  body: string;
}

interface PendingVideo {
  lessonDayId: string;
  periodId: string;
  className: string;
  date: string;
  period: number;
  teacherName: string;
  maxPercent: number;
}

const DISPLAY_COMPLETE_PERCENT = 80;
const POPUP_SESSION_KEY = 'tbc_student_popups_shown';

function markPopupsShownThisLogin() {
  sessionStorage.setItem(POPUP_SESSION_KEY, '1');
}

function werePopupsShownThisLogin(): boolean {
  return sessionStorage.getItem(POPUP_SESSION_KEY) === '1';
}

function todayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function formatLessonDate(d: string): string {
  try {
    const date = new Date(`${d}T12:00:00`);
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const wd = date.toLocaleDateString('ko-KR', { weekday: 'short' });
    return `${m}. ${day} (${wd})`;
  } catch {
    return d;
  }
}

function progressLabel(maxPercent: number): string {
  if (maxPercent >= DISPLAY_COMPLETE_PERCENT) return '진행완료';
  return `진행률 ${Math.round(maxPercent)}%`;
}

function sortPendingVideos(list: PendingVideo[]): PendingVideo[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.period - b.period;
  });
}

export default function StudentPopups({ isAdminAccess }: { isAdminAccess: boolean }) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const apiPrefix = role === 'parent' ? 'parent' : 'student';

  const [announcements, setAnnouncements] = useState<ActiveAnnouncement[]>([]);
  const [pending, setPending] = useState<PendingVideo[]>([]);
  const [stage, setStage] = useState<'announcement' | 'pending' | 'done'>(() =>
    werePopupsShownThisLogin() ? 'done' : 'announcement'
  );

  useEffect(() => {
    if (werePopupsShownThisLogin()) return;
    let cancelled = false;
    apiClient
      .get<{ success: boolean; data: ActiveAnnouncement[] }>(`/${apiPrefix}/announcements/active`)
      .then((res) => {
        if (cancelled) return;
        const list = res.data.success && Array.isArray(res.data.data) ? res.data.data : [];
        setAnnouncements(list);
        if (list.length === 0) setStage('pending');
      })
      .catch(() => {
        if (!cancelled) setStage('pending');
      });
    return () => {
      cancelled = true;
    };
  }, [apiPrefix]);

  useEffect(() => {
    if (stage !== 'pending') return;
    if (role !== 'student' || isAdminAccess) {
      markPopupsShownThisLogin();
      setStage('done');
      return;
    }
    let cancelled = false;
    apiClient
      .get<{ success: boolean; data: PendingVideo[] }>('/student/review-videos/pending')
      .then((res) => {
        if (cancelled) return;
        const list = res.data.success && Array.isArray(res.data.data) ? res.data.data : [];
        setPending(sortPendingVideos(list));
        if (list.length === 0) {
          markPopupsShownThisLogin();
          setStage('done');
        }
      })
      .catch(() => {
        if (!cancelled) {
          markPopupsShownThisLogin();
          setStage('done');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stage, role, isAdminAccess]);

  const current = announcements[0];
  const showMultipleClasses = new Set(pending.map((p) => p.className).filter(Boolean)).size > 1;

  const closeAnnouncement = async (mode: 'confirm' | 'today' | 'forever') => {
    if (!current) return;
    if (mode === 'today' || mode === 'forever') {
      try {
        await apiClient.post(`/${apiPrefix}/announcements/${current._id}/dismiss`, {
          hideUntil: mode === 'forever' ? '9999-12-31' : todayYmd(),
        });
      } catch {
        // continue
      }
    }
    const rest = announcements.slice(1);
    setAnnouncements(rest);
    if (rest.length === 0) setStage('pending');
  };

  const closePendingModal = () => {
    setPending([]);
    markPopupsShownThisLogin();
    setStage('done');
  };

  const openVideo = (item: PendingVideo) => {
    navigate(`/student/videos/${item.lessonDayId}/${item.periodId}`);
    closePendingModal();
  };

  if (stage === 'announcement' && current) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{current.className}</p>
          <h2 className="text-lg font-bold text-slate-950 mb-3">{current.title}</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-6">{current.body}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void closeAnnouncement('forever')}
              className="w-full py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700"
            >
              앞으로 계속 보지 않기
            </button>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => void closeAnnouncement('today')}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700"
              >
                오늘 하루 보지 않기
              </button>
              <button
                type="button"
                onClick={() => void closeAnnouncement('confirm')}
                className="flex-1 py-2.5 bg-slate-950 text-white rounded-lg text-sm font-semibold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'pending' && pending.length > 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 max-h-[80vh] flex flex-col">
          <h2 className="text-lg font-bold text-slate-950 mb-1">결석 수업 복습 영상</h2>
          <p className="text-sm text-slate-500 mb-4">
            최근 14일 결석 수업 중 아직 다 보지 않은 영상 {pending.length}개
          </p>
          <ul className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-2 mb-4">
            {pending.map((item) => {
              const done = item.maxPercent >= DISPLAY_COMPLETE_PERCENT;
              const teacherLabel = item.teacherName ? `${item.teacherName}T` : '-';
              return (
                <li key={`${item.lessonDayId}-${item.periodId}`}>
                  <button
                    type="button"
                    onClick={() => openVideo(item)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-colors"
                  >
                    {showMultipleClasses && item.className && (
                      <p className="text-[11px] font-bold text-slate-400 mb-1">{item.className}</p>
                    )}
                    <p className="text-sm font-semibold text-slate-900">
                      {formatLessonDate(item.date)} · {item.period}교시 · {teacherLabel}
                    </p>
                    <p
                      className={`text-xs mt-1 font-medium ${done ? 'text-emerald-600' : 'text-slate-500'}`}
                    >
                      {progressLabel(item.maxPercent)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={closePendingModal}
            className="w-full py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium"
          >
            나중에
          </button>
        </div>
      </div>
    );
  }

  return null;
}
