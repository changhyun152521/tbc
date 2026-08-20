import { useEffect, useRef, useState } from 'react';

interface DateNavigatorProps {
  value: string;
  onChange: (date: string) => void;
  /** YYYY-MM-DD, 등록된 교시가 있는 날 */
  markedDates?: string[];
  className?: string;
}

function toYmd(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseYmd(dateStr: string): { year: number; month: number; day: number } {
  const d = new Date(`${dateStr}T12:00:00`);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toYmd(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDisplay(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    const wd = d.toLocaleDateString('ko-KR', { weekday: 'short' });
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`;
  } catch {
    return dateStr;
  }
}

export default function DateNavigator({
  value,
  onChange,
  markedDates = [],
  className = '',
}: DateNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const p = parseYmd(value || new Date().toISOString().slice(0, 10));
    return { year: p.year, month: p.month };
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const markedSet = new Set(markedDates);

  useEffect(() => {
    if (!value) return;
    const p = parseYmd(value);
    setViewMonth({ year: p.year, month: p.month });
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const firstDay = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];

  const goPrevMonth = () => {
    setViewMonth((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }
    );
  };

  const goNextMonth = () => {
    setViewMonth((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }
    );
  };

  const selectDay = (day: number) => {
    onChange(toYmd(viewMonth.year, viewMonth.month, day));
    setIsOpen(false);
  };

  const navButtonClass =
    'shrink-0 p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300';

  return (
    <div ref={containerRef} className={`relative flex items-center gap-2 ${className}`}>
      <label className="shrink-0 text-xs font-bold text-slate-500 uppercase tracking-wide">날짜</label>
      <button
        type="button"
        onClick={() => onChange(shiftDate(value, -1))}
        className={navButtonClass}
        aria-label="이전 날"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="h-[42px] px-4 py-2.5 box-border bg-white border border-slate-200 rounded-lg text-[14px] text-slate-900 hover:border-slate-400 min-w-[168px] text-center"
        aria-label="날짜 선택"
      >
        {formatDisplay(value)}
      </button>

      <button
        type="button"
        onClick={() => onChange(shiftDate(value, 1))}
        className={navButtonClass}
        aria-label="다음 날"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-10 mt-2 z-50 w-[280px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="이전 달"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {viewMonth.year}년 {viewMonth.month + 1}월
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="다음 달"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 px-3 pt-3 pb-1">
            {weekLabels.map((label, i) => (
              <div
                key={label}
                className={`text-center text-[11px] font-medium py-1 ${
                  i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pb-3">
            {days.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="h-9" />;
              const dateStr = toYmd(viewMonth.year, viewMonth.month, day);
              const selected = value === dateStr;
              const marked = markedSet.has(dateStr);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`relative h-9 rounded-lg text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-slate-800 text-white'
                      : marked
                        ? 'text-slate-800 bg-slate-100 hover:bg-slate-200'
                        : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {day}
                  {marked && !selected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-slate-500" />
                  )}
                  {marked && selected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="px-3 pb-3 text-[11px] text-slate-400">점이 있는 날은 등록된 교시가 있습니다.</p>
        </div>
      )}
    </div>
  );
}
