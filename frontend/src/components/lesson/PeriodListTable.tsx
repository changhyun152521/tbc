export type PeriodRowStatus = 'empty' | 'mine' | 'other';

export interface PeriodRowItem {
  periodNumber: number;
  status: PeriodRowStatus;
  teacherName?: string;
  periodIndex?: number;
  /** 빈 칸 제거 가능 (끝 슬롯만) */
  removable?: boolean;
  reviewLabel: string;
}

interface PeriodListTableProps {
  rows: PeriodRowItem[];
  selectedPeriodNumber: number | null;
  onSelect: (periodNumber: number) => void;
  onRemoveEmptySlot?: (periodNumber: number) => void;
  onExtendSlots: () => void;
  adding?: boolean;
}

function roleLabel(status: PeriodRowStatus): string {
  if (status === 'empty') return '비어있음';
  if (status === 'other') return '다른 강사';
  return '나';
}

function rowClasses(status: PeriodRowStatus, selected: boolean): string {
  const base = 'cursor-pointer transition-colors border-b border-slate-100 last:border-b-0';
  if (status === 'mine') {
    return selected
      ? `${base} bg-sky-50 border-l-[3px] border-l-sky-500`
      : `${base} bg-white border-l-[3px] border-l-sky-400 hover:bg-sky-50/60`;
  }
  if (status === 'other') {
    return selected
      ? `${base} bg-slate-200 border-l-[3px] border-l-slate-400`
      : `${base} bg-slate-50 border-l-[3px] border-l-slate-300 hover:bg-slate-100`;
  }
  return selected
    ? `${base} bg-slate-100 border-l-[3px] border-l-slate-300`
    : `${base} bg-white border-l-[3px] border-l-transparent hover:bg-slate-50`;
}

function roleCellClasses(status: PeriodRowStatus): string {
  if (status === 'mine') return 'text-sky-700 font-medium';
  if (status === 'other') return 'text-slate-600';
  return 'text-slate-400';
}

export default function PeriodListTable({
  rows,
  selectedPeriodNumber,
  onSelect,
  onRemoveEmptySlot,
  onExtendSlots,
  adding = false,
}: PeriodListTableProps) {
  const lastRow = rows[rows.length - 1];
  const canShrink =
    lastRow?.status === 'empty' && lastRow.removable === true && onRemoveEmptySlot != null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={adding}
          onClick={onExtendSlots}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          + 교시 추가
        </button>
        <button
          type="button"
          disabled={adding || !canShrink}
          onClick={() => canShrink && onRemoveEmptySlot!(lastRow!.periodNumber)}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          × 교시 제거
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
          등록된 교시가 없습니다. 교시 추가 버튼을 눌러 시작하세요.
        </p>
      ) : (
        <div className="overflow-x-auto scrollbar-hide border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse min-w-[280px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-xs font-semibold">
                <th className="px-3 py-2.5 w-16 whitespace-nowrap">교시</th>
                <th className="px-3 py-2.5 whitespace-nowrap">담당</th>
                <th className="px-3 py-2.5 w-24 whitespace-nowrap">구분</th>
                <th className="px-3 py-2.5 w-20 whitespace-nowrap">복습영상</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const selected = selectedPeriodNumber === row.periodNumber;
                return (
                  <tr
                    key={row.periodNumber}
                    onClick={() => onSelect(row.periodNumber)}
                    className={rowClasses(row.status, selected)}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {row.periodNumber}교시
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {row.status === 'empty' ? '—' : row.teacherName || '—'}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${roleCellClasses(row.status)}`}>
                      {roleLabel(row.status)}
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {row.reviewLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
