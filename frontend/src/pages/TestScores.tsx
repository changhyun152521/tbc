import { useState, useEffect, useMemo } from 'react';
import { FileCheckIcon } from '../components/ui/Icons';
import RecordDatePicker from '../components/RecordDatePicker';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useStudentClass } from '../contexts/StudentClassContext';

type TestType = 'weeklyTest' | 'realTest';

interface StudentTestItem {
  _id: string;
  testType: TestType;
  date: string;
  questionCount?: number;
  myScore: number | null;
  average: number | null;
  maxScore?: number | null;
  source?: string;
  subject?: string;
  bigUnit?: string;
  smallUnit?: string;
}

const TEST_TYPE_LABEL: Record<string, string> = {
  weeklyTest: '주간TEST',
  realTest: '실전TEST',
};

function formatAsPoint(value: number | null | undefined, questionCount?: number): string {
  if (value == null) return '-';
  if (questionCount == null || questionCount <= 0) return `${value}점`;
  const pct = Math.round((value / questionCount) * 100);
  return `${pct}점`;
}

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

function todayDateOnly(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function TestCard({ t, typeLabel }: { t: StudentTestItem; typeLabel: string }) {
  const parts = [(t.subject ?? '').trim(), (t.smallUnit ?? '').trim()].filter(Boolean);
  const title = typeLabel === '주간TEST'
    ? (parts.length > 0 ? parts.join(' · ') : '주간TEST')
    : ((t.source ?? '').trim() || '실전TEST');

  return (
    <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm">
      <p className="text-[13px] font-bold text-slate-700 mb-4">{title}</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">내 점수</p>
          <p className="text-sm font-semibold text-slate-700">
            {formatAsPoint(t.myScore, t.questionCount)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">반 평균</p>
          <p className="text-sm font-semibold text-slate-600">
            {formatAsPoint(t.average, t.questionCount)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">최고점</p>
          <p className="text-sm font-semibold text-slate-600">
            {formatAsPoint(t.maxScore, t.questionCount)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TestScores() {
  const { role } = useAuth();
  const { selectedClassId } = useStudentClass();
  const [allTests, setAllTests] = useState<StudentTestItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayDateOnly());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiPrefix = role === 'parent' ? 'parent' : 'student';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = selectedClassId ? { classId: selectedClassId } : {};
    apiClient
      .get<{ success: boolean; data: { tests: StudentTestItem[] } }>(`/${apiPrefix}/tests`, { params })
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && Array.isArray(res.data.data?.tests)) {
          const tests = res.data.data.tests;
          setAllTests(tests);
          if (tests.length > 0) {
            const latest = tests.reduce((max, t) => {
              const d = toDateOnly(t.date);
              return d > max ? d : max;
            }, toDateOnly(tests[0].date));
            setSelectedDate(latest);
          } else {
            setSelectedDate(todayDateOnly());
          }
        } else {
          setAllTests([]);
          setSelectedDate(todayDateOnly());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('테스트 결과를 불러올 수 없습니다.');
          setAllTests([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiPrefix, selectedClassId]);

  const handleDateChange = (next: string) => {
    if (!next) return;
    setSelectedDate(next);
  };

  const availableDates = useMemo(
    () => [...new Set(allTests.map((t) => toDateOnly(t.date)))].sort(),
    [allTests]
  );

  const { weeklyTests, realTests } = useMemo(() => {
    const forDay = allTests.filter((t) => toDateOnly(t.date) === selectedDate);
    const weekly = forDay.filter((t) => t.testType === 'weeklyTest').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const real = forDay.filter((t) => t.testType === 'realTest').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { weeklyTests: weekly, realTests: real };
  }, [allTests, selectedDate]);

  const hasAny = weeklyTests.length > 0 || realTests.length > 0;

  return (
    <div className="flex flex-col pt-2 sm:pt-4 px-4 sm:px-6 pb-20 lg:pb-8 font-sans text-slate-950">
      {/* 1. 상단 헤더: 메인페이지 강사명·슬로건 스타일 동기화 */}
      <div className="flex flex-col items-center select-none mb-8 sm:mb-10 pt-2">
        {/* 아이콘 */}
        <div className="relative mb-4">
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-slate-300/40 rounded-full blur-md"
            aria-hidden
          />
          <FileCheckIcon
            className="h-14 w-14 sm:h-16 sm:w-16 relative"
            strokeWidth={1.8}
            stroke="rgb(30 64 175)"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.2))' }}
          />
        </div>

        <div className="flex flex-col items-center w-full max-w-[200px] sm:max-w-[220px]">
          <h1 className="font-title font-bold text-[23px] sm:text-[25px] tracking-[0.02em] text-slate-700">
            테스트 결과
          </h1>
          <p className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-[0.18em] sm:tracking-[0.25em] leading-none whitespace-nowrap">
            내 점수와 반 평균 확인
          </p>
          <div className="w-8 h-[2px] bg-slate-200 mt-5 rounded-full" aria-hidden />
        </div>

        {/* 날짜 선택기: 기록이 있는 날만 선택 가능 */}
        <div className="mt-6 sm:mt-8 w-full max-w-[200px] sm:max-w-[220px]">
          <RecordDatePicker
            value={selectedDate}
            onChange={handleDateChange}
            availableDates={availableDates.length > 0 ? availableDates : [selectedDate]}
          />
        </div>
      </div>

      {error && (
        <div className="max-w-lg mx-auto w-full mb-4 p-4 bg-red-50 text-red-700 rounded-[20px] text-sm font-medium border border-red-100" role="alert">
          {error}
        </div>
      )}

      {/* 2. 테스트 카드 리스트: 홈 화면 박스 스타일 */}
      <div className="max-w-lg mx-auto w-full space-y-6 flex-1">
        {loading ? (
          <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm text-center text-slate-500 text-sm font-medium">
            로딩 중...
          </div>
        ) : !hasAny ? (
          <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm text-center text-slate-500 text-sm font-medium">
            해당 날짜에 테스트가 없습니다.<br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>위에서 다른 날짜를 선택해 보세요.
          </div>
        ) : (
          <>
            {weeklyTests.length > 0 && (
              <section>
                <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-tight mb-3">
                  {TEST_TYPE_LABEL.weeklyTest}
                </h3>
                <div className="space-y-4">
                  {weeklyTests.map((t) => (
                    <TestCard key={t._id} t={t} typeLabel={TEST_TYPE_LABEL.weeklyTest} />
                  ))}
                </div>
              </section>
            )}
            {realTests.length > 0 && (
              <section>
                <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-tight mb-3">
                  {TEST_TYPE_LABEL.realTest}
                </h3>
                <div className="space-y-4">
                  {realTests.map((t) => (
                    <TestCard key={t._id} t={t} typeLabel={TEST_TYPE_LABEL.realTest} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
