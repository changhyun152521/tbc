import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';

interface WatchStatRow {
  studentId: string;
  studentName: string;
  date: string;
  period: number;
  attendance: string;
  watchedSec: number;
  playTimeSec: number;
  maxPercent: number;
}

interface ClassWatchStatsSectionProps {
  classId: string;
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysYmd(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}시간 ${m % 60}분 ${r}초`;
  }
  return `${m}분 ${r}초`;
}

export default function ClassWatchStatsSection({ classId }: ClassWatchStatsSectionProps) {
  const defaultTo = todayYmd();
  const defaultFrom = addDaysYmd(defaultTo, -14);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);
  const [list, setList] = useState<WatchStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchList = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ dateFrom: from, dateTo: to });
      const res = await apiClient.get<{ success: boolean; data: WatchStatRow[] }>(
        `/admin/classes/${classId}/review-watch-stats?${params}`
      );
      setList(res.data.success && Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      setError('시청 현황을 불러올 수 없습니다.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void fetchList(appliedFrom, appliedTo);
  }, [fetchList, appliedFrom, appliedTo]);

  const handleSearch = () => {
    if (!dateFrom || !dateTo) {
      setError('시작일과 종료일을 모두 선택해 주세요.');
      return;
    }
    if (dateFrom > dateTo) {
      setError('시작일은 종료일보다 이후일 수 없습니다.');
      return;
    }
    setError('');
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  const inputClass =
    'px-3 py-2 bg-white border border-slate-200 rounded-lg text-[14px] text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none';

  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 sm:px-5 lg:px-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-slate-600 text-sm sm:text-base font-bold uppercase tracking-wide">복습 영상 현황</h2>
          <p className="text-xs text-slate-400 mt-0.5">기본: 오늘 기준 최근 14일</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputClass}
            title="시작일"
          />
          <span className="text-slate-400 text-sm">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputClass}
            title="종료일"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
          >
            조회
          </button>
        </div>
      </div>
      {error && <div className="mx-4 mt-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm">로딩 중...</div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          선택한 기간에 복습 영상이 등록된 교시가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-table">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-slate-500 text-xs font-bold whitespace-nowrap">학생</th>
                <th className="py-3 px-4 text-slate-500 text-xs font-bold whitespace-nowrap">수업일</th>
                <th className="py-3 px-4 text-slate-500 text-xs font-bold whitespace-nowrap">교시</th>
                <th className="py-3 px-4 text-slate-500 text-xs font-bold whitespace-nowrap">출결</th>
                <th className="py-3 px-4 text-slate-500 text-xs font-bold whitespace-nowrap">진행률</th>
                <th className="py-3 px-4 text-slate-500 text-xs font-bold whitespace-nowrap">시청 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[14px]">
              {list.map((row) => (
                <tr key={`${row.studentId}-${row.date}-${row.period}`} className="hover:bg-slate-50 text-slate-700">
                  <td className="py-3 px-4 font-medium text-slate-950 whitespace-nowrap">{row.studentName}</td>
                  <td className="py-3 px-4 whitespace-nowrap font-number">{row.date}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{row.period}교시</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {row.attendance === 'O' ? '출석' : row.attendance === 'X' ? '결석' : '-'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-number">{Math.round(row.maxPercent)}%</td>
                  <td className="py-3 px-4 whitespace-nowrap font-number">{formatDuration(row.playTimeSec ?? row.watchedSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
