import { useState, useEffect, useCallback } from 'react';
import RecordDatePicker from '../components/RecordDatePicker';

function LibraryIcon({ className, strokeWidth, stroke, style }: { className?: string; strokeWidth?: number; stroke?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke ?? 'currentColor'} strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="m4 4 2.5 2.5" />
      <path d="M3 7h2" />
      <path d="M3 11h2" />
      <path d="M3 15h2" />
      <path d="M3 19h2" />
      <path d="M7 4v16" />
      <path d="M11 4v16" />
      <path d="M15 4v16" />
      <path d="M19 4v16" />
      <path d="M19 4h2" />
      <path d="M19 8h2" />
      <path d="M19 12h2" />
      <path d="M19 16h2" />
      <path d="M19 20h2" />
    </svg>
  );
}

function ChevronRightIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useStudentClass } from '../contexts/StudentClassContext';

interface LessonItem {
  _id: string;
  date: string;
  period: string;
  progress: string;
  homework: string;
  homeworkDone?: boolean;
  attendanceStatus?: string;
  homeworkDescription?: string;
  homeworkDueDate?: string;
  teacherName?: string;
  note?: string;
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

function formatDueDateBadge(d: string): string {
  try {
    const date = new Date(d);
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const wd = date.toLocaleDateString('ko-KR', { weekday: 'short' });
    return `${m}.${String(day).padStart(2, '0')} (${wd})`;
  } catch {
    return d;
  }
}

function todayDateOnly(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export default function LessonHistory() {
  const { role } = useAuth();
  const { selectedClassId } = useStudentClass();
  const [selectedDate, setSelectedDate] = useState<string>(todayDateOnly());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [list, setList] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiPrefix = role === 'parent' ? 'parent' : 'student';

  const fetchForDate = useCallback(
    (date: string) => {
      if (!date) return;
      setLoading(true);
      setError('');
      const from = new Date(date + 'T00:00:00').toISOString();
      const to = new Date(date + 'T23:59:59').toISOString();
      apiClient
        .get<{ success: boolean; data: { lessons: LessonItem[] } }>(`/${apiPrefix}/lessons`, {
          params: { from, to },
        })
        .then((res) => {
          if (res.data.success && Array.isArray(res.data.data?.lessons)) {
            setList(res.data.data.lessons);
          } else {
            setList([]);
          }
        })
        .catch(() => {
          setError('진도/과제를 불러올 수 없습니다.');
          setList([]);
        })
        .finally(() => setLoading(false));
    },
    [apiPrefix, selectedClassId]
  );

  const fetchLatestThenSetDate = useCallback(() => {
    setLoading(true);
    setError('');
    const today = todayDateOnly();
    const from = new Date(today);
    from.setDate(from.getDate() - 60);
    const to = new Date(today + 'T23:59:59');
    const params: Record<string, string> = { from: from.toISOString(), to: to.toISOString() };
    if (selectedClassId) params.classId = selectedClassId;
    apiClient
      .get<{ success: boolean; data: { lessons: LessonItem[] } }>(`/${apiPrefix}/lessons`, {
        params,
      })
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.data?.lessons) && res.data.data.lessons.length > 0) {
          const lessons = res.data.data.lessons;
          const dates = [...new Set(lessons.map((l) => toDateOnly(l.date)))].sort();
          setAvailableDates(dates);
          const latestDay = dates[dates.length - 1] ?? toDateOnly(lessons[0].date);
          setSelectedDate(latestDay);
          setList(lessons.filter((l) => toDateOnly(l.date) === latestDay));
        } else {
          setAvailableDates([]);
          setSelectedDate(today);
          setList([]);
        }
      })
      .catch(() => {
        setError('진도/과제를 불러올 수 없습니다.');
        setAvailableDates([]);
        setList([]);
        setSelectedDate(todayDateOnly());
      })
      .finally(() => setLoading(false));
  }, [apiPrefix, selectedClassId]);

  useEffect(() => {
    fetchLatestThenSetDate();
  }, [fetchLatestThenSetDate]);

  const handleDateChange = (next: string) => {
    if (!next) return;
    setSelectedDate(next);
    fetchForDate(next);
  };

  const sortedPeriods = [...list].sort((a, b) => Number(a.period) - Number(b.period));

  return (
    <div className="flex flex-col pt-2 sm:pt-4 px-4 sm:px-6 pb-20 lg:pb-8 font-sans text-slate-950">
      {/* 1. 상단 헤더: 메인페이지 강사명·슬로건 스타일 동기화 */}
      <div className="flex flex-col items-center select-none mb-8 sm:mb-10 pt-2">
        {/* 아이콘: drop-shadow */}
        <div className="relative mb-4">
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-slate-300/40 rounded-full blur-md"
            aria-hidden
          />
          <LibraryIcon
            className="h-14 w-14 sm:h-16 sm:w-16 relative"
            strokeWidth={1.8}
            stroke="rgb(30 64 175)"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.2))' }}
          />
        </div>

        <div className="flex flex-col items-center w-full max-w-[200px] sm:max-w-[220px]">
          <h1 className="font-title font-bold text-[23px] sm:text-[25px] tracking-[0.02em] text-slate-700">
            진도 및 과제 현황
          </h1>
          <p className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-[0.18em] sm:tracking-[0.25em] leading-none whitespace-nowrap">
            오늘의 학습 진도와 과제 현황
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

      {/* 2. 상세 카드 리스트: 홈 화면 박스 스타일 */}
      <div className="max-w-lg mx-auto w-full space-y-6 flex-1">
        {loading ? (
          <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm text-center text-slate-500 text-sm font-medium">
            로딩 중...
          </div>
        ) : sortedPeriods.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm text-center text-slate-500 text-sm font-medium">
            해당 날짜에 수업이 없습니다.<br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>위에서 다른 날짜를 선택해 보세요.
          </div>
        ) : (
          sortedPeriods.map((l) => (
            <section
              key={l._id}
              className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm"
            >
              {/* 카드 헤더: 홈 제출 예정 과제 스타일 */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-[15px] font-bold text-slate-700">
                  {l.period}교시{l.teacherName ? ` · ${l.teacherName} 선생님` : ''}
                </p>
                <ChevronRightIcon size={16} className="text-slate-300 shrink-0" />
              </div>

              <div className="space-y-4">
                {/* 학습 진도: 홈 과제 본문 스타일 */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-1">학습 진도</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {l.progress || '-'}
                  </p>
                </div>

                <div className="h-[1px] bg-slate-50" />

                {/* 부여된 과제 */}
                <div>
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">부여된 과제</p>
                    {l.homeworkDueDate && (
                      <span className="text-[11px] text-rose-500 font-bold shrink-0">
                        마감 {formatDueDateBadge(l.homeworkDueDate)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {l.homeworkDescription || '-'}
                  </p>
                </div>

                {(l.note ?? '').trim() ? (
                  <>
                    <div className="h-[1px] bg-slate-50" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-1">Comment</p>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{l.note}</p>
                    </div>
                  </>
                ) : null}

                {/* 출결/과제 상태: 홈 스타일 */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-tight">출결</p>
                    <p className="text-xl font-bold uppercase">
                      {l.attendanceStatus === 'O' ? (
                        <span className="text-emerald-600">O</span>
                      ) : l.attendanceStatus === 'X' ? (
                        <span className="text-rose-500">X</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-tight">과제 이행</p>
                    <p className="text-xl font-bold uppercase">
                      {l.homeworkDone === true ? (
                        <span className="text-emerald-600">O</span>
                      ) : l.homework === '미제출' || l.homeworkDone === false ? (
                        <span className="text-rose-500">X</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
