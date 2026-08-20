import type { MouseEvent } from 'react';

export type PeriodRowStatus = 'empty' | 'mine' | 'other';

export interface PeriodRowItem {
  periodNumber: number;
  status: PeriodRowStatus;
  teacherName?: string;
  periodIndex?: number;
  /** 빈 칸 제거 가능 (끝 슬롯만) */
  removable?: boolean;
}

interface PeriodListTableProps {
  rows: PeriodRowItem[];
  selectedPeriodNumber: number | null;
  onSelect: (periodNumber: number) => void;
  onRemoveEmptySlot?: (periodNumber: number) => void;
  onExtendSlots: () => void;
  onReorder?: (periodIndex: number, fromNumber: number, toNumber: number) => void;
  reordering?: boolean;
  adding?: boolean;
  /** 강사 화면: 이름 옆 나/다른 강사 뱃지 */
  showRoleBadges?: boolean;
}

function rowClasses(selected: boolean): string {
  const base = 'cursor-pointer transition-colors border-b border-slate-100 last:border-b-0';
  return selected ? `${base} bg-slate-50` : `${base} bg-white hover:bg-slate-50`;
}

function NameBadge({ status }: { status: PeriodRowStatus }) {
  if (status === 'mine') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-white shrink-0">
        나
      </span>
    );
  }
  if (status === 'other') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white text-slate-600 border border-slate-300 shrink-0">
        다른 강사
      </span>
    );
  }
  return null;
}

export default function PeriodListTable({
  rows,
  selectedPeriodNumber,
  onSelect,
  onRemoveEmptySlot,
  onExtendSlots,
  onReorder,
  reordering = false,
  adding = false,
  showRoleBadges = true,
}: PeriodListTableProps) {
  const lastRow = rows[rows.length - 1];
  const canShrink =
    lastRow?.status === 'empty' && lastRow.removable === true && onRemoveEmptySlot != null;
  const busy = adding || reordering;

  const handleReorder = (row: PeriodRowItem, direction: -1 | 1, e: MouseEvent) => {
    e.stopPropagation();
    if (!onReorder) return;
    const i = rows.findIndex((r) => r.periodNumber === row.periodNumber);
    const adj = rows[i + direction];
    if (!adj) return;

    const moving = row.status !== 'empty' && row.periodIndex != null ? row : adj;
    const destination = moving === row ? adj : row;
    if (moving.status === 'empty' || moving.periodIndex == null) return;

    onReorder(moving.periodIndex, moving.periodNumber, destination.periodNumber);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onExtendSlots}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          + 교시 추가
        </button>
        <button
          type="button"
          disabled={busy || !canShrink}
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
          <table className="w-full text-left border-collapse min-w-[240px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-xs font-semibold">
                <th className="px-3 py-2.5 w-16 whitespace-nowrap">교시</th>
                <th className="px-3 py-2.5 whitespace-nowrap">담당</th>
                <th className="px-3 py-2.5 w-16 whitespace-nowrap text-right">순서</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const selected = selectedPeriodNumber === row.periodNumber;
                const canMove = Boolean(onReorder);
                const prev = rows[rowIndex - 1];
                const next = rows[rowIndex + 1];
                const canUp =
                  rowIndex > 0 && !(row.status === 'empty' && prev?.status === 'empty');
                const canDown =
                  rowIndex < rows.length - 1 && !(row.status === 'empty' && next?.status === 'empty');
                return (
                  <tr
                    key={row.periodNumber}
                    onClick={() => onSelect(row.periodNumber)}
                    className={rowClasses(selected)}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {row.periodNumber}교시
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {row.status === 'empty' ? (
                        <span className="text-slate-400">비어있음</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span>{row.teacherName || '—'}</span>
                          {showRoleBadges && <NameBadge status={row.status} />}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {canMove ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <button
                            type="button"
                            disabled={busy || !canUp}
                            onClick={(e) => handleReorder(row, -1, e)}
                            className="w-7 h-6 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent"
                            title="위로"
                            aria-label={`${row.periodNumber}교시 위로`}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={busy || !canDown}
                            onClick={(e) => handleReorder(row, 1, e)}
                            className="w-7 h-6 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent"
                            title="아래로"
                            aria-label={`${row.periodNumber}교시 아래로`}
                          >
                            ▼
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 px-2 block text-right">—</span>
                      )}
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
