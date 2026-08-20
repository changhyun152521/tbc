import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

interface ActiveTeacherAnnouncement {
  _id: string;
  title: string;
  body: string;
}

const POPUP_SESSION_KEY = 'tbc_teacher_popups_shown';

function markPopupsShownThisLogin() {
  sessionStorage.setItem(POPUP_SESSION_KEY, '1');
}

function werePopupsShownThisLogin(): boolean {
  return sessionStorage.getItem(POPUP_SESSION_KEY) === '1';
}

function todayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

/** 강사 로그인 세션당 1회만 표시. 메뉴 이동 시에는 다시 뜨지 않음. */
export default function TeacherAnnouncementPopups() {
  const [announcements, setAnnouncements] = useState<ActiveTeacherAnnouncement[]>([]);
  const [done, setDone] = useState(() => werePopupsShownThisLogin());

  useEffect(() => {
    if (werePopupsShownThisLogin()) return;
    let cancelled = false;
    apiClient
      .get<{ success: boolean; data: ActiveTeacherAnnouncement[] }>('/admin/teacher-announcements/active')
      .then((res) => {
        if (cancelled) return;
        const list = res.data.success && Array.isArray(res.data.data) ? res.data.data : [];
        setAnnouncements(list);
        if (list.length === 0) {
          markPopupsShownThisLogin();
          setDone(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          markPopupsShownThisLogin();
          setDone(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = announcements[0];

  const closeAnnouncement = async (hideToday: boolean) => {
    if (!current) return;
    if (hideToday) {
      try {
        await apiClient.post(`/admin/teacher-announcements/${current._id}/dismiss`, {
          hideUntil: todayYmd(),
        });
      } catch {
        // continue
      }
    }
    const rest = announcements.slice(1);
    setAnnouncements(rest);
    if (rest.length === 0) {
      markPopupsShownThisLogin();
      setDone(true);
    }
  };

  if (done || !current) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">강사 공지</p>
        <h2 className="text-lg font-bold text-slate-950 mb-3">{current.title}</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-6">{current.body}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => void closeAnnouncement(true)}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700"
          >
            오늘 하루 보지 않기
          </button>
          <button
            type="button"
            onClick={() => void closeAnnouncement(false)}
            className="flex-1 py-2.5 bg-slate-950 text-white rounded-lg text-sm font-semibold"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
