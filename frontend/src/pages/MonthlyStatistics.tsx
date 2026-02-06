import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3Icon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/ui/Icons';
import { apiClient } from '../api/client';
import ScoreTrendChart from '../components/ScoreTrendChart';
import { useAuth } from '../contexts/AuthContext';
import { useStudentClass } from '../contexts/StudentClassContext';

interface LessonItem {
  _id: string;
  date: string;
  period: string;
  homeworkDone?: boolean;
  attendanceStatus?: string;
}

interface StudentTestItem {
  _id: string;
  testType: string;
  date: string;
  questionCount?: number;
  myScore: number | null;
  average: number | null;
  maxScore?: number | null;
  source?: string;
  subject?: string;
  smallUnit?: string;
}

const TEST_TYPE_LABEL: Record<string, string> = {
  weeklyTest: '주간TEST',
  realTest: '실전TEST',
};

function toDateOnly(d: string): string {
  try {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return d.slice(0, 10);
  }
}

function getScoreAsPercent(value: number | null | undefined, questionCount?: number): number | null {
  if (value == null) return null;
  if (questionCount == null || questionCount <= 0) return Math.min(100, Math.round(value));
  return Math.round((value / questionCount) * 100);
}

function getTestTitle(t: StudentTestItem): string {
  const typeLabel = TEST_TYPE_LABEL[t.testType] ?? t.testType;
  if (t.testType === 'weeklyTest') {
    const parts = [(t.subject ?? '').trim(), (t.smallUnit ?? '').trim()].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : typeLabel;
  }
  return ((t.source ?? '').trim() || typeLabel);
}

function formatChartDate(d: string): string {
  try {
    const date = new Date(d);
    const m = date.getMonth() + 1;
    const day = date.getDate();
    return `${m}.${String(day).padStart(2, '0')}`;
  } catch {
    return d.slice(5, 10);
  }
}

function formatListDate(d: string): string {
  try {
    const date = new Date(d);
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const wd = date.toLocaleDateString('ko-KR', { weekday: 'short' });
    return `${m}.${String(day).padStart(2, '0')} (${wd})`;
  } catch {
    return d.slice(0, 10);
  }
}

function formatScore(value: number | null | undefined, questionCount?: number): string {
  const pct = getScoreAsPercent(value, questionCount);
  return pct != null ? `${pct}점` : '-';
}

export default function MonthlyStatistics() {
  const { role } = useAuth();
  const { selectedClassId } = useStudentClass();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [allTests, setAllTests] = useState<StudentTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiPrefix = role === 'parent' ? 'parent' : 'student';

  const fetchData = useCallback(() => {
    setLoading(true);
    setError('');
    const start = new Date(viewYear, viewMonth - 1, 1);
    const end = new Date(viewYear, viewMonth, 0, 23, 59, 59);
    const from = start.toISOString();
    const to = end.toISOString();
    const baseParams = { from, to };
    const lessonsParams = selectedClassId ? { ...baseParams, classId: selectedClassId } : baseParams;
    const testsParams = selectedClassId ? { classId: selectedClassId } : {};

    Promise.all([
      apiClient.get<{ success: boolean; data: { lessons: LessonItem[] } }>(`/${apiPrefix}/lessons`, {
        params: lessonsParams,
      }),
      apiClient.get<{ success: boolean; data: { tests: StudentTestItem[] } }>(`/${apiPrefix}/tests`, {
        params: testsParams,
      }),
    ])
      .then(([lessonsRes, testsRes]) => {
        if (lessonsRes.data.success && Array.isArray(lessonsRes.data.data?.lessons)) {
          setLessons(lessonsRes.data.data.lessons);
        } else {
          setLessons([]);
        }
        if (testsRes.data.success && Array.isArray(testsRes.data.data?.tests)) {
          setAllTests(testsRes.data.data.tests);
        } else {
          setAllTests([]);
        }
      })
      .catch(() => {
        setError('데이터를 불러올 수 없습니다.');
        setLessons([]);
        setAllTests([]);
      })
      .finally(() => setLoading(false));
  }, [apiPrefix, viewYear, viewMonth, selectedClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthLabel = `${viewYear}년 ${viewMonth}월`;

  const calendarData = useMemo(() => {
    const byDate: Record<
      string,
      { attendanceDisplay: 'O' | 'X' | null; homeworkDisplay: 'O' | 'X' | null }
    > = {};
    for (const l of lessons) {
      const d = toDateOnly(l.date);
      if (!byDate[d]) {
        byDate[d] = { attendanceDisplay: null, homeworkDisplay: null };
      }
      const att = (l.attendanceStatus ?? '').trim();
      if (att === 'X') byDate[d].attendanceDisplay = 'X';
      else if (att === 'O' && byDate[d].attendanceDisplay !== 'X') byDate[d].attendanceDisplay = 'O';
      if (l.homeworkDone === false) byDate[d].homeworkDisplay = 'X';
      else if (l.homeworkDone === true && byDate[d].homeworkDisplay !== 'X') byDate[d].homeworkDisplay = 'O';
    }
    return byDate;
  }, [lessons]);

  const testsInMonth = useMemo(() => {
    const start = new Date(viewYear, viewMonth - 1, 1).getTime();
    const end = new Date(viewYear, viewMonth, 0, 23, 59, 59).getTime();
    return allTests
      .filter((t) => {
        const tTime = new Date(t.date).getTime();
        return tTime >= start && tTime <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allTests, viewYear, viewMonth]);

  const chartData = useMemo(() => {
    return testsInMonth.map((t) => ({
      date: formatChartDate(t.date),
      fullDate: t.date,
      name: getTestTitle(t),
      myScore: getScoreAsPercent(t.myScore, t.questionCount),
      average: getScoreAsPercent(t.average, t.questionCount),
      maxScore: getScoreAsPercent(t.maxScore, t.questionCount),
    }));
  }, [testsInMonth]);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarCells.push(i);

  return (
    <div className="flex flex-col pt-2 sm:pt-4 px-4 sm:px-6 pb-20 lg:pb-8 font-sans text-slate-950 bg-slate-50">
      {/* 헤더 */}
      <div className="flex flex-col items-center select-none mb-8 sm:mb-10 pt-2">
        <div className="relative mb-4">
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-slate-300/40 rounded-full blur-md"
            aria-hidden
          />
          <BarChart3Icon
            className="h-14 w-14 sm:h-16 sm:w-16 relative"
            strokeWidth={1.8}
            stroke="rgb(30 64 175)"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.2))' }}
          />
        </div>
        <div className="flex flex-col items-center w-full max-w-[220px] sm:max-w-[260px]">
          <h1 className="font-title font-bold text-[23px] sm:text-[25px] tracking-[0.02em] text-slate-700">
            월별 학습 통계
          </h1>
          <p className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-[0.18em] sm:tracking-[0.25em] leading-none whitespace-nowrap">
            한 달 학습 현황 한눈에
          </p>
          <div className="w-8 h-[2px] bg-slate-200 mt-5 rounded-full" aria-hidden />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-[20px] text-sm font-medium border border-red-100" role="alert">
          {error}
        </div>
      )}

      <div className="max-w-lg mx-auto w-full space-y-8">
        {/* 1. 캘린더 섹션 */}
        <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[17px] font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon size={18} className="text-slate-500" stroke="rgb(30 64 175)" />
              {monthLabel}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrevMonth}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="이전 달"
              >
                <ChevronLeftIcon size={20} />
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="다음 달"
              >
                <ChevronRightIcon size={20} />
              </button>
            </div>
          </div>
          <div className="flex gap-4 mb-3 text-[12px] sm:text-[14px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-emerald-600">O</span>/<span className="font-bold text-emerald-600">X</span> 출결
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-indigo-600">O</span>/<span className="font-bold text-indigo-600">X</span> 과제
            </span>
          </div>
          {loading ? (
            <div className="aspect-square max-h-[280px] w-full bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
              로딩 중...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[280px]">
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {weekLabels.map((label, i) => (
                    <div
                      key={label}
                      className={`text-center text-[11px] sm:text-[13px] font-medium py-1 ${
                        i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarCells.map((day, idx) => {
                    if (day === null) {
                      return <div key={`e-${idx}`} className="aspect-square min-h-[32px] sm:min-h-[36px]" />;
                    }
                    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const data = calendarData[dateStr];
                    const attD = data?.attendanceDisplay ?? null;
                    const hwD = data?.homeworkDisplay ?? null;
                    return (
                      <div
                        key={day}
                        className="aspect-square min-h-[36px] sm:min-h-[40px] p-0.5 sm:p-1 bg-slate-50/50 rounded-lg border border-slate-100 flex flex-col items-center justify-center"
                      >
                        <span className="text-[12px] sm:text-[14px] font-semibold text-slate-700 mb-0.5">
                          {day}
                        </span>
                        <div className="flex gap-0.5 sm:gap-1 items-center justify-center text-[12px] sm:text-[13px] font-bold">
                          {attD != null && (
                            <span className="text-emerald-600">{attD}</span>
                          )}
                          {hwD != null && (
                            <span className="text-indigo-600">{hwD}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. 테스트 기록 표 */}
        <section>
          <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-tight mb-4 ml-1">
            테스트 기록
          </h3>
          {loading ? (
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 text-center text-slate-500 text-sm">
              로딩 중...
            </div>
          ) : testsInMonth.length === 0 ? (
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 text-center text-slate-500 text-sm">
              해당 월에 테스트 기록이 없습니다.
            </div>
          ) : (
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto scrollbar-table">
                <table className="w-full min-w-[480px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">
                        날짜
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">
                        시험 유형
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">
                        내 점수
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">
                        반 평균
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">
                        최고점
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {testsInMonth.map((t) => (
                      <tr key={t._id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-800 whitespace-nowrap">
                          {formatListDate(t.date)}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-800 whitespace-nowrap">
                          {TEST_TYPE_LABEL[t.testType] ?? t.testType}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-800 whitespace-nowrap">
                          {formatScore(t.myScore, t.questionCount)}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-500 whitespace-nowrap">
                          {formatScore(t.average, t.questionCount)}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-500 whitespace-nowrap">
                          {formatScore(t.maxScore, t.questionCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* 3. 라인 차트 */}
        <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-tight mb-6 ml-1">
            점수 추이
          </h3>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">
              로딩 중...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
              표시할 테스트가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {/* 범례: 그래프 바깥, 전체 박스 중앙 정렬, 스크롤해도 고정 */}
              <div className="flex justify-center">
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[12px] font-medium text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                    내 점수
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                    반 평균
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    최고점
                  </span>
                </div>
              </div>

              <div className="relative min-h-[280px]">
                <ScoreTrendChart data={chartData} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
