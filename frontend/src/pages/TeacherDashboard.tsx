import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Home, Users } from 'lucide-react';
import { apiClient } from '../api/client';
import ReplyInboxSection from '../components/notifications/ReplyInboxSection';

interface TeacherDashboardData {
  classCount: number;
  studentCount: number;
  recentAbsences: Array<{
    studentId: string;
    studentName: string;
    className: string;
    lessonDayId: string;
    periodId: string;
    date: string;
    period: number;
    hasReviewVideo: boolean;
    maxPercent: number;
  }>;
  recentPeriods: Array<{
    classId: string;
    className: string;
    lessonDayId: string;
    periodId: string;
    date: string;
    period: number;
  }>;
}

const PROGRESS_DONE_PERCENT = 80;

function formatDateLabel(d: string): string {
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

function groupByDate<T extends { date: string; period: number }>(items: T[]): { date: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.date) ?? [];
    list.push(item);
    map.set(item.date, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, groupItems]) => ({
      date,
      items: [...groupItems].sort((a, b) => a.period - b.period),
    }));
}

function VideoProgressBadge({ hasReviewVideo, maxPercent }: { hasReviewVideo: boolean; maxPercent: number }) {
  if (!hasReviewVideo) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500">
        영상 없음
      </span>
    );
  }
  if (maxPercent >= PROGRESS_DONE_PERCENT) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700">
        진행완료 {Math.round(maxPercent)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700">
      진행률 {Math.round(maxPercent)}%
    </span>
  );
}

export default function TeacherDashboard() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<{ success: boolean; data: TeacherDashboardData & { incompleteReviewVideos?: TeacherDashboardData['recentAbsences'] } }>(
        '/admin/teacher/dashboard'
      )
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.data) {
          const raw = res.data.data;
          const legacy = raw.incompleteReviewVideos ?? [];
          const absences = raw.recentAbsences ?? legacy.map((row) => ({
            ...row,
            hasReviewVideo: (row as { hasReviewVideo?: boolean }).hasReviewVideo ?? true,
          }));
          setData({
            classCount: raw.classCount ?? 0,
            studentCount: raw.studentCount ?? 0,
            recentAbsences: absences,
            recentPeriods: raw.recentPeriods ?? [],
          });
        } else {
          setData(null);
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { label: '담당 반', value: data?.classCount ?? 0, icon: Home },
    { label: '담당 학생', value: data?.studentCount ?? 0, icon: Users },
  ];

  const recentAbsences = data?.recentAbsences ?? [];
  const recentPeriods = data?.recentPeriods ?? [];
  const absencesByDate = groupByDate(recentAbsences);
  const periodsByDate = groupByDate(recentPeriods);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-8 sm:pt-12 px-4 sm:px-6 lg:px-10 pb-16 sm:pb-20 font-sans text-slate-900">
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex flex-col items-center mb-8 sm:mb-10 text-center">
          <div className="mb-3 sm:mb-4 text-indigo-600">
            <LayoutDashboard size={44} strokeWidth={1.5} className="sm:w-[52px] sm:h-[52px] w-11 h-11" />
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-black tracking-tight text-slate-800">대시보드</h1>
          <p className="text-[11px] sm:text-[13px] font-bold text-slate-400 mt-1 uppercase tracking-[0.15em]">
            담당 반 · 학생 현황
          </p>
        </div>

        <div className="mb-8 sm:mb-10">
          <div className="grid grid-cols-2 gap-3 sm:gap-5 max-w-md mx-auto">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-3 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 sm:gap-3"
                >
                  <div className="p-2 sm:p-3 bg-indigo-50 rounded-xl sm:rounded-2xl text-indigo-500">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-[13px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">
                      {stat.label}
                    </p>
                    {loading ? (
                      <p className="text-2xl sm:text-3xl font-black text-slate-200">-</p>
                    ) : (
                      <p className="text-2xl sm:text-3xl font-black text-indigo-600 tabular-nums">{stat.value}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-8 sm:mb-10">
          <ReplyInboxSection />
        </div>

        <div className="mb-8">
          <h3 className="text-[12px] sm:text-[14px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
            최근 14일 결석
          </h3>
          <p className="text-xs text-slate-400 mb-4 ml-1">내 교시 기준 · 복습 영상 진행률 포함</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">로딩 중...</div>
            ) : recentAbsences.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">최근 14일간 결석 학생이 없습니다.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {absencesByDate.map((group) => (
                  <section key={group.date}>
                    <div className="px-4 py-2.5 sm:px-5 bg-slate-50 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-500">{formatDateLabel(group.date)}</p>
                    </div>
                    <ul className="divide-y divide-slate-50">
                      {group.items.map((row) => (
                        <li key={`${row.studentId}-${row.lessonDayId}-${row.periodId}`} className="px-4 py-3 sm:px-5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">
                                {row.studentName} · {row.className}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">{row.period}교시</p>
                            </div>
                            <VideoProgressBadge hasReviewVideo={row.hasReviewVideo} maxPercent={row.maxPercent} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-[12px] sm:text-[14px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
            1주일간 내 교시
          </h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">로딩 중...</div>
            ) : recentPeriods.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">최근 7일간 등록된 내 교시가 없습니다.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {periodsByDate.map((group) => (
                  <section key={group.date}>
                    <div className="px-4 py-2.5 sm:px-5 bg-slate-50 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-500">{formatDateLabel(group.date)}</p>
                    </div>
                    <ul className="divide-y divide-slate-50">
                      {group.items.map((row) => (
                        <li key={`${row.lessonDayId}-${row.periodId}`}>
                          <Link
                            to={`/admin/lessons/classroom/${row.classId}`}
                            className="block px-4 py-3 sm:px-5 hover:bg-slate-50 transition-colors"
                          >
                            <p className="text-sm font-semibold text-slate-900">{row.period}교시 · {row.className}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
