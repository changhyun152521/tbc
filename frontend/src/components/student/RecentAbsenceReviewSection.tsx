import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useStudentClass } from '../../contexts/StudentClassContext';

export interface AbsenceReviewItem {
  lessonDayId: string;
  periodId: string;
  className: string;
  date: string;
  period: number;
  teacherName: string;
  maxPercent: number;
  videoCount: number;
}

const INITIAL_COUNT = 5;
const DISPLAY_COMPLETE_PERCENT = 80;

function formatLessonDate(d: string): string {
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

function progressLabel(maxPercent: number): string {
  if (maxPercent >= DISPLAY_COMPLETE_PERCENT) return '진행완료';
  return `진행률 ${Math.round(maxPercent)}%`;
}

interface RecentAbsenceReviewSectionProps {
  enabled: boolean;
}

export default function RecentAbsenceReviewSection({ enabled }: RecentAbsenceReviewSectionProps) {
  const navigate = useNavigate();
  const { selectedClassId } = useStudentClass();
  const [items, setItems] = useState<AbsenceReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setExpanded(false);
    const params = selectedClassId ? { classId: selectedClassId } : {};
    apiClient
      .get<{ success: boolean; data: AbsenceReviewItem[] }>('/student/review-videos/absence', { params })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.success && Array.isArray(res.data.data) ? res.data.data : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, selectedClassId]);

  if (!enabled) return null;

  const showMultipleClasses = new Set(items.map((p) => p.className).filter(Boolean)).size > 1;
  const visibleItems = expanded ? items : items.slice(0, INITIAL_COUNT);
  const hasMore = items.length > INITIAL_COUNT;

  const openLesson = (item: AbsenceReviewItem) => {
    const q = new URLSearchParams({ date: item.date, period: String(item.period) });
    if (selectedClassId) q.set('classId', selectedClassId);
    navigate(`/student/lessons?${q.toString()}`);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[20px] p-4 sm:p-6 shadow-sm">
      <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2 text-sm sm:text-base">
        <span>🎬</span>
        결석 수업 복습 영상
      </h2>
      <p className="text-[11px] text-slate-400 mb-4 sm:mb-6">결석한 수업 중 등록된 복습 영상입니다. 탭하면 해당 수업일·교시로 이동합니다.</p>

      {loading ? (
        <p className="text-slate-400 text-xs sm:text-sm font-medium py-2">로딩 중...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400 text-xs sm:text-sm font-medium py-2">등록된 결석 복습 영상이 없습니다.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {visibleItems.map((item) => {
              const done = item.maxPercent >= DISPLAY_COMPLETE_PERCENT;
              const teacherLabel = item.teacherName ? `${item.teacherName}T` : '-';
              return (
                <li key={`${item.lessonDayId}-${item.periodId}`}>
                  <button
                    type="button"
                    onClick={() => openLesson(item)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-colors"
                  >
                    {showMultipleClasses && item.className && (
                      <p className="text-[11px] font-bold text-slate-400 mb-1">{item.className}</p>
                    )}
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatLessonDate(item.date)} · {item.period}교시 · {teacherLabel}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                          done ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {progressLabel(item.maxPercent)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full mt-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {expanded ? '접기' : `더보기 (${items.length - INITIAL_COUNT}개)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
