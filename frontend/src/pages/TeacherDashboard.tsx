import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Home, Users, UserSquare2, BookOpen, FileText, ChevronRight } from 'lucide-react';
import { apiClient } from '../api/client';

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

  const quickMenus = [
    { to: '/admin/students', label: '학생 관리', icon: Users },
    { to: '/admin/teachers', label: '강사 관리', icon: UserSquare2 },
    { to: '/admin/classes', label: '반 관리', icon: Home },
    { to: '/admin/lessons', label: '수업 관리', icon: BookOpen },
    { to: '/admin/tests', label: '시험 관리', icon: FileText },
  ];

  const stats = [
    { label: '담당 반', value: data?.classCount ?? 0, icon: Home },
    { label: '담당 학생', value: data?.studentCount ?? 0, icon: Users },
  ];

  const recentAbsences = data?.recentAbsences ?? [];
  const recentPeriods = data?.recentPeriods ?? [];

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
          <h3 className="text-[12px] sm:text-[14px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
            Quick Menu
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {quickMenus.map((menu) => {
              const Icon = menu.icon;
              return (
                <Link
                  key={menu.to}
                  to={menu.to}
                  className="group bg-white p-4 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-start transition-all hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 mb-3 sm:mb-4">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <div className="w-full flex justify-between items-center">
                    <span className="text-[14px] sm:text-[16px] font-bold text-slate-700 group-hover:text-indigo-600">
                      {menu.label}
                    </span>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400" />
                  </div>
                </Link>
              );
            })}
          </div>
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
              <ul className="divide-y divide-slate-100">
                {recentAbsences.map((row) => (
                  <li key={`${row.studentId}-${row.lessonDayId}-${row.periodId}`} className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {row.studentName} · {row.className}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDateLabel(row.date)} · {row.period}교시
                        </p>
                      </div>
                      <VideoProgressBadge hasReviewVideo={row.hasReviewVideo} maxPercent={row.maxPercent} />
                    </div>
                  </li>
                ))}
              </ul>
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
              <ul className="divide-y divide-slate-100">
                {recentPeriods.map((row) => (
                  <li key={`${row.lessonDayId}-${row.periodId}`}>
                    <Link
                      to={`/admin/lessons/classroom/${row.classId}`}
                      className="block px-4 py-3 sm:px-5 hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {formatDateLabel(row.date)} · {row.period}교시
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{row.className}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
