import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

interface DashboardCounts {
  studentTotal: number;
  teacherCount: number;
  classCount: number;
}

export default function AdminDashboard() {
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

  const quickLinks = [
    { to: '/admin/students', label: '학생 관리' },
    { to: '/admin/teachers', label: '강사 관리' },
    { to: '/admin/classes', label: '반 관리' },
    { to: '/admin/lessons', label: '수업 관리' },
    { to: '/admin/tests', label: '시험 관리' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-title font-bold text-slate-950">대시보드</h1>
          <p className="text-sm text-slate-500 mt-1">전체 현황을 한눈에 확인합니다.</p>
        </div>

        {/* 요약 통계 */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6">
          <div className="p-4 sm:p-6">
            <h2 className="text-slate-600 text-[13px] font-semibold mb-4">요약</h2>
            {loading ? (
              <div className="py-8 text-center text-slate-500 text-sm">로딩 중...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-slate-500 text-sm font-medium">전체 학생</p>
                  <p className="text-2xl font-bold text-slate-950 mt-0.5">{counts.studentTotal}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm font-medium">강사</p>
                  <p className="text-2xl font-bold text-slate-950 mt-0.5">{counts.teacherCount}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm font-medium">반</p>
                  <p className="text-2xl font-bold text-slate-950 mt-0.5">{counts.classCount}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 빠른 메뉴 */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6">
            <h2 className="text-slate-600 text-[13px] font-semibold mb-4">빠른 메뉴</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {quickLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="block p-3 rounded-lg border border-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-200 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
