export type PeriodChipStatus = 'empty' | 'mine' | 'other';

export interface PeriodChipItem {
  periodNumber: number;
  status: PeriodChipStatus;
  teacherName?: string;
  periodIndex?: number;
  /** 빈 칸 제거 가능 (끝 슬롯만) */
  removable?: boolean;
}

interface PeriodChipBarProps {
  chips: PeriodChipItem[];
  selectedPeriodNumber: number | null;
  onSelect: (periodNumber: number) => void;
  onRemoveEmptySlot?: (periodNumber: number) => void;
  onExtendSlots: () => void;
  adding?: boolean;
}

const ROW_BASE =
  'w-full px-4 py-3.5 rounded-xl border text-sm font-semibold transition-colors text-left';

function chipLabel(chip: PeriodChipItem): string {
  if (chip.status === 'empty') return `${chip.periodNumber}교시 · 비어있음`;
  if (chip.status === 'other') {
    return `${chip.periodNumber}교시 ${chip.teacherName ?? ''} (다른 강사)`.trim();
  }
  return `${chip.periodNumber}교시 ${chip.teacherName ?? ''} (나)`.trim();
}

function chipClasses(status: PeriodChipStatus, selected: boolean): string {
  if (status === 'empty') {
    return selected
      ? `${ROW_BASE} border-slate-400 bg-white text-slate-700 ring-2 ring-slate-300`
      : `${ROW_BASE} border-dashed border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-400`;
  }
  if (status === 'other') {
    return selected
      ? `${ROW_BASE} border-slate-600 bg-slate-200 text-slate-900 ring-2 ring-slate-400`
      : `${ROW_BASE} border-slate-400 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:border-slate-500`;
  }
  return selected
    ? `${ROW_BASE} border-sky-600 bg-sky-600 text-white ring-2 ring-sky-300 shadow-sm`
    : `${ROW_BASE} border-sky-500 bg-sky-50 text-sky-900 hover:bg-sky-100 shadow-sm`;
}

const ACTION_ROW =
  'w-full py-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export default function PeriodChipBar({
  chips,
  selectedPeriodNumber,
  onSelect,
  onRemoveEmptySlot,
  onExtendSlots,
  adding = false,
}: PeriodChipBarProps) {
  const lastChip = chips[chips.length - 1];
  const canShrink =
    lastChip?.status === 'empty' && lastChip.removable === true && onRemoveEmptySlot != null;

  return (
    <div className="space-y-2">
      {chips.map((chip) => {
        const selected = selectedPeriodNumber === chip.periodNumber;
        return (
          <button
            key={chip.periodNumber}
            type="button"
            disabled={adding && chip.status === 'empty'}
            onClick={() => onSelect(chip.periodNumber)}
            className={chipClasses(chip.status, selected)}
          >
            {chipLabel(chip)}
          </button>
        );
      })}

      <button
        type="button"
        disabled={adding}
        onClick={onExtendSlots}
        className={`${ACTION_ROW} border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400`}
        title="교시 줄 추가"
        aria-label="교시 줄 추가"
      >
        + 교시 추가
      </button>

      <button
        type="button"
        disabled={adding || !canShrink}
        onClick={() => canShrink && onRemoveEmptySlot!(lastChip!.periodNumber)}
        className={`${ACTION_ROW} border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-400`}
        title="마지막 빈 교시 줄 제거"
        aria-label="마지막 빈 교시 줄 제거"
      >
        × 교시 제거
      </button>
    </div>
  );
}
