import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

function formatDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const wd = d.toLocaleDateString('ko-KR', { weekday: 'short' });
    return `${m}월 ${day}일 (${wd})`;
  } catch {
    return dateStr;
  }
}

interface RecordDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  availableDates: string[];
  className?: string;
}

export default function RecordDatePicker({
  value,
  onChange,
  availableDates,
  className = '',
}: RecordDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const availableSet = new Set(availableDates);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const firstDay = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];

  const goPrevMonth = () => {
    if (viewMonth.month === 0) {
      setViewMonth({ year: viewMonth.year - 1, month: 11 });
    } else {
      setViewMonth({ year: viewMonth.year, month: viewMonth.month - 1 });
    }
  };

  const goNextMonth = () => {
    if (viewMonth.month === 11) {
      setViewMonth({ year: viewMonth.year + 1, month: 0 });
    } else {
      setViewMonth({ year: viewMonth.year, month: viewMonth.month + 1 });
    }
  };

  const selectDate = (day: number) => {
    const y = viewMonth.year;
    const m = String(viewMonth.month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (availableSet.has(dateStr)) {
      onChange(dateStr);
      setIsOpen(false);
    }
  };

  const isAvailable = (day: number) => {
    const y = viewMonth.year;
    const m = String(viewMonth.month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return availableSet.has(`${y}-${m}-${d}`);
  };

  const isSelected = (day: number) => {
    const y = viewMonth.year;
    const m = String(viewMonth.month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return value === `${y}-${m}-${d}`;
  };

  const monthLabel = `${viewMonth.year}년 ${viewMonth.month + 1}월`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center justify-center gap-2 w-full bg-white border border-slate-100 rounded-[20px] px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm hover:border-slate-200 transition-colors cursor-pointer text-center"
        aria-label="날짜 선택"
      >
        <Calendar size={16} className="text-slate-500 shrink-0" />
        <span className="text-sm font-semibold text-slate-700">
          {formatDisplay(value)}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-[280px] bg-white border border-slate-200 rounded-[16px] shadow-lg overflow-hidden">
          {/* 달력 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="이전 달"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-700">{monthLabel}</span>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="다음 달"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
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

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1 px-3 pb-4">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-9" />;
              }
              const available = isAvailable(day);
              const selected = isSelected(day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!available}
                  onClick={() => selectDate(day)}
                  className={`
                    h-9 rounded-lg text-sm font-medium transition-colors
                    ${available
                      ? selected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 cursor-not-allowed'}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

