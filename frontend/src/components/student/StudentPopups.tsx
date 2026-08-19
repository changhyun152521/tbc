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
  maxPercent: number;
}

function todayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default function StudentPopups({ isAdminAccess }: { isAdminAccess: boolean }) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const apiPrefix = role === 'parent' ? 'parent' : 'student';

  const [announcements, setAnnouncements] = useState<ActiveAnnouncement[]>([]);
  const [pending, setPending] = useState<PendingVideo[]>([]);
  const [stage, setStage] = useState<'announcement' | 'pending' | 'done'>('announcement');

  useEffect(() => {
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
      setStage('done');
      return;
    }
    let cancelled = false;
    apiClient
      .get<{ success: boolean; data: PendingVideo[] }>('/student/review-videos/pending')
      .then((res) => {
        if (cancelled) return;
        const list = res.data.success && Array.isArray(res.data.data) ? res.data.data : [];
        setPending(list);
        if (list.length === 0) setStage('done');
      })
      .catch(() => {
        if (!cancelled) setStage('done');
      });
    return () => {
      cancelled = true;
    };
  }, [stage, role, isAdminAccess]);

  const current = announcements[0];
  const pendingItem = pending[0];

  const closeAnnouncement = async (hideToday: boolean) => {
    if (!current) return;
    if (hideToday) {
      try {
        await apiClient.post(`/${apiPrefix}/announcements/${current._id}/dismiss`, {
          hideUntil: todayYmd(),
        });
      } catch {
        // continue
      }
    }
    const rest = announcements.slice(1);
    setAnnouncements(rest);
    if (rest.length === 0) setStage('pending');
  };

  const closePending = () => {
    const rest = pending.slice(1);
    setPending(rest);
    if (rest.length === 0) setStage('done');
  };

  if (stage === 'announcement' && current) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{current.className}</p>
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

  if (stage === 'pending' && pendingItem) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
          <h2 className="text-lg font-bold text-slate-950 mb-2">결석 수업 복습 영상</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {pendingItem.className} · {pendingItem.date} {pendingItem.period}교시 결석 수업의 복습 영상을 아직 다 보지 않았어요.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={closePending}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700"
            >
              나중에
            </button>
            <button
              type="button"
              onClick={() => {
                navigate(`/student/videos/${pendingItem.lessonDayId}/${pendingItem.periodId}`);
                closePending();
              }}
              className="flex-1 py-2.5 bg-slate-950 text-white rounded-lg text-sm font-semibold"
            >
              영상 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
