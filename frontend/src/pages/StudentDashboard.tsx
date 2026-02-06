import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon } from '../components/ui/Icons';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useStudentClass } from '../contexts/StudentClassContext';

interface DashboardData {
  student: { id: string; name: string; school: string; grade: string };
  class: { _id: string; name: string; description: string } | null;
  teacherNames: string[];
  recentLessons: Array<{
    _id: string;
    date: string;
    period: string;
    progress: string;
    homework?: string;
    homeworkDone?: boolean;
  }>;
  recentTests: Array<{
    _id: string;
    testType: string;
    date: string;
    questionCount?: number;
    myScore: number | null;
    average?: number | null;
  }>;
  homeworkSummary: { total: number; done: number; rate: number };
  attendanceSummary: { total: number; attended: number; rate: number };
  recentHomework: Array<{
    _id: string;
    date: string;
    teacherName: string;
    homeworkDescription?: string;
    homeworkDueDate?: string;
  }>;
  recentComments: Array<{
    _id: string;
    date: string;
    teacherName: string;
    note: string;
  }>;
}

function formatDueDateShort(d: string): string {
  try {
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return d;
  }
}

function todayDateOnly(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export default function StudentDashboard() {
  const { role } = useAuth();
  const { selectedClassId } = useStudentClass();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiPrefix = role === 'parent' ? 'parent' : 'student';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = selectedClassId ? { classId: selectedClassId } : {};
    apiClient
      .get<{ success: boolean; data: DashboardData }>(`/${apiPrefix}/dashboard`, { params })
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.data) {
          setData(res.data.data);
        } else {
          setData(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('대시보드를 불러올 수 없습니다.');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiPrefix, selectedClassId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-6 pb-12">
        <div className="max-w-md mx-auto w-full py-12 text-center text-slate-400 text-sm font-medium">
          로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-6 pb-12">
        <div className="max-w-md mx-auto w-full p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const d = data!;
  const teachers = d.teacherNames ?? [];
  const today = todayDateOnly();
  const pendingHomework = (d.recentHomework ?? [])
    .filter((h) => {
      const due = (h.homeworkDueDate ?? '').trim();
      return due && due >= today;
    })
    .sort((a, b) => {
      const da = (a.homeworkDueDate ?? '').trim();
      const db = (b.homeworkDueDate ?? '').trim();
      return da.localeCompare(db);
    });
  const recentComments = (d.recentComments ?? []).slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-4 px-6 pb-12 font-sans text-slate-950">
      {/* 1. 브랜드 헤더: 투명 로고 + 강사명·슬로건 너비 동기화 */}
      <div className="flex flex-col items-center select-none mb-8 sm:mb-10 pt-2">
        {/* 투명 로고: 배경 없음, drop-shadow만, 하단 원형 블러 */}
        <div className="relative mb-4">
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 sm:w-20 sm:h-2.5 bg-slate-300/40 rounded-full blur-md"
            aria-hidden
          />
          <img
            src="/images/더브레인코어 로고1.png"
            alt="THE BRAIN CORE"
            className="relative h-20 sm:h-24 w-auto object-contain"
            style={{
              filter: 'drop-shadow(0 12px 14px rgba(15, 23, 42, 0.18)) contrast(1.05)',
            }}
          />
        </div>

        {/* 강사명 + 슬로건: Slate-700·× 1:1·너비 일치 */}
        {teachers.length > 0 && (
          <div className="flex flex-col items-center w-full max-w-[200px] sm:max-w-[220px]">
            <div className="flex items-center justify-center gap-1.5 w-full text-slate-700">
              {teachers.map((name, i) => (
                <Fragment key={name}>
                  {i > 0 && (
                    <span className="font-title font-light text-[24px] sm:text-[26px] text-slate-400 select-none">
                      ×
                    </span>
                  )}
                  <span className="font-title font-bold text-[23px] sm:text-[25px] tracking-[0.02em]">
                    {name}
                  </span>
                </Fragment>
              ))}
            </div>
            <p className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-[0.18em] sm:tracking-[0.25em] leading-none whitespace-nowrap">
              최고의 몰입, 최상의 결과
            </p>
            <div className="w-8 h-[2px] bg-slate-200 mt-5 rounded-full" aria-hidden />
          </div>
        )}
      </div>

      {/* 2. 대시보드 메인 카드 영역 */}
      <div className="max-w-lg mx-auto w-full space-y-6">
        {/* 제출 예정 과제 카드 */}
        <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="flex items-center gap-2 font-bold text-slate-800">
              <BookOpenIcon className="w-5 h-5 text-slate-500" />
              제출 예정 과제
            </h2>
            <Link
              to="/student/lessons"
              className="text-[11px] font-bold text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-tight"
            >
              전체보기
            </Link>
          </div>
          <div className="space-y-4">
            {pendingHomework.length === 0 ? (
              <p className="text-slate-400 text-sm font-medium py-4">제출 예정인 과제가 없습니다.</p>
            ) : (
              pendingHomework.map((h, idx) => (
                <div key={h._id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[13px] font-bold text-slate-700">{h.teacherName} 선생님</p>
                      {h.homeworkDueDate && (
                        <p className="text-[11px] text-slate-400">제출기한 {formatDueDateShort(h.homeworkDueDate)}</p>
                      )}
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-md font-bold shrink-0 bg-amber-50 text-amber-600">
                      제출예정
                    </span>
                  </div>
                  {h.homeworkDescription && (
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mt-1">{h.homeworkDescription}</p>
                  )}
                  {idx < pendingHomework.length - 1 && <div className="h-[1px] bg-slate-50 mt-4" />}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 댓글형 코멘트 섹션 (최신 5개 피드 방식) */}
        <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span>💌</span>
            선생님들이 보낸 응원 메시지
          </h2>
          <div className="space-y-6">
            {recentComments.length === 0 ? (
              <p className="text-slate-400 text-sm font-medium py-2">최근 응원 메시지가 없습니다.</p>
            ) : (
              recentComments.map((c, i) => (
                <div key={c._id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-400">{c.teacherName} 선생님</span>
                    <span className="text-[10px] text-slate-300 font-medium">
                      {formatDueDateShort(c.date)}
                    </span>
                  </div>
                  <p className="text-[14px] text-slate-700 leading-relaxed font-medium">
                    &quot;{c.note}&quot;
                  </p>
                  {i !== recentComments.length - 1 && (
                    <div className="mt-4 h-[1px] bg-slate-50 w-full" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
