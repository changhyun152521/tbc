import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  Home,
  BookOpen,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import TeacherDashboard from './TeacherDashboard';

interface DashboardCounts {
  studentTotal: number;
  teacherCount: number;
  classCount: number;
}

export default function AdminDashboard() {
  const { role } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts>({
    studentTotal: 0,
    teacherCount: 0,
    classCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient.get<{ success: boolean; data: { total?: number; list?: unknown[] } }>('/admin/students?page=1&limit=1'),
      apiClient.get<{ success: boolean; data: unknown[] }>('/admin/teachers'),
      apiClient.get<{ success: boolean; data: unknown[] }>('/admin/classes'),
    ])
      .then(([studentsRes, teachersRes, classesRes]) => {
        if (cancelled) return;
        const studentTotal = studentsRes.data.success && studentsRes.data.data && 'total' in studentsRes.data.data
          ? Number((studentsRes.data.data as { total: number }).total) ?? 0
          : 0;
        const teacherCount = teachersRes.data.success && Array.isArray(teachersRes.data.data)
          ? teachersRes.data.data.length
          : 0;
        const classCount = classesRes.data.success && Array.isArray(classesRes.data.data)
          ? classesRes.data.data.length
          : 0;
        setCounts({ studentTotal, teacherCount, classCount });
      })
      .catch(() => {
        if (!cancelled) setCounts({ studentTotal: 0, teacherCount: 0, classCount: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const quickMenus = [
    { to: '/admin/students', label: '학생 관리', icon: Users },
    { to: '/admin/teachers', label: '강사 관리', icon: UserSquare2 },
    { to: '/admin/classes', label: '반 관리', icon: Home },
    { to: '/admin/lessons', label: '수업 관리', icon: BookOpen },
    { to: '/admin/tests', label: '시험 관리', icon: FileText },
  ];

  const stats = [
    { label: '전체 학생', value: counts.studentTotal, icon: Users },
    { label: '담당 강사', value: counts.teacherCount, icon: UserSquare2 },
    { label: '운영 중인 반', value: counts.classCount, icon: Home },
  ];

  if (role === 'teacher') {
    return <TeacherDashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-8 sm:pt-12 px-4 sm:px-6 lg:px-10 pb-16 sm:pb-20 font-sans text-slate-900">
      <div className="w-full max-w-5xl mx-auto">
        {/* 1. 일관된 헤더 섹션 */}
        <div className="flex flex-col items-center mb-8 sm:mb-12 text-center">
          <div className="mb-3 sm:mb-4 text-indigo-600">
            <LayoutDashboard size={44} strokeWidth={1.5} className="sm:w-[52px] sm:h-[52px] w-11 h-11" />
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-black tracking-tight text-slate-800">
            대시보드
          </h1>
          <p className="text-[11px] sm:text-[13px] font-bold text-slate-400 mt-1 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
            전체 현황 및 빠른 관리
          </p>
        </div>

        {/* 2. 요약 섹션: PC·모바일 모두 한 줄 3열 (모바일은 Quick Menu와 비슷한 글씨·아이콘·박스 톤) */}
        <div className="mb-8 sm:mb-10">
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-3 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 sm:gap-3 min-w-0"
                >
                  <div className="p-2 sm:p-3 bg-indigo-50 rounded-xl sm:rounded-2xl text-indigo-500 shrink-0">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-xs sm:text-[13px] font-bold text-slate-400 uppercase tracking-tight mb-0.5 sm:mb-1 truncate leading-tight">
                      {stat.label}
                    </p>
                    {loading ? (
                      <p className="text-2xl sm:text-3xl font-black text-slate-200 leading-none">-</p>
                    ) : (
                      <p className="text-2xl sm:text-3xl font-black text-indigo-600 tabular-nums leading-none">
                        {stat.value}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 빠른 메뉴: 타일형 카드 */}
        <div>
          <h3 className="text-[12px] sm:text-[14px] font-black text-slate-400 uppercase tracking-widest mb-4 sm:mb-5 ml-1 sm:ml-2">
            Quick Menu
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {quickMenus.map((menu) => {
              const Icon = menu.icon;
              return (
                <Link
                  key={menu.to}
                  to={menu.to}
                  className="group bg-white p-4 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-start transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors duration-200 mb-3 sm:mb-4">
                    <Icon size={20} strokeWidth={2} className="sm:w-5 sm:h-5 w-5 h-5" />
                  </div>
                  <div className="w-full flex justify-between items-center min-w-0">
                    <span className="text-[14px] sm:text-[16px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate pr-1">
                      {menu.label}
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-slate-300 group-hover:text-indigo-400 transition-all duration-200 shrink-0 group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
