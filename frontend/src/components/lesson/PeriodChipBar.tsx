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

const CHIP_BASE =
  'px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-colors shadow-sm text-left';

function chipLabel(chip: PeriodChipItem): string {
  if (chip.status === 'empty') return `${chip.periodNumber}교시 · 비어있음`;
  return `${chip.periodNumber}교시 · ${chip.teacherName ?? ''}`;
}

function chipClasses(status: PeriodChipStatus, selected: boolean): string {
  if (status === 'empty') {
    return selected
      ? `${CHIP_BASE} border-slate-400 bg-slate-200 text-slate-800 ring-2 ring-slate-300`
      : `${CHIP_BASE} border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-400`;
  }
  if (status === 'other') {
    return selected
      ? `${CHIP_BASE} border-amber-500 bg-amber-500 text-white ring-2 ring-amber-300`
      : `${CHIP_BASE} border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100`;
  }
  return selected
    ? `${CHIP_BASE} border-sky-600 bg-sky-600 text-white ring-2 ring-sky-300`
    : `${CHIP_BASE} border-sky-500 bg-sky-50 text-sky-900 hover:bg-sky-100`;
}

const ACTION_BTN =
  'shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-600 text-lg font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white';

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
    <div className="flex flex-wrap items-center gap-2">
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
        className={ACTION_BTN}
        title="교시 칸 추가"
        aria-label="교시 칸 추가"
      >
        +
      </button>
      <button
        type="button"
        disabled={adding || !canShrink}
        onClick={() => canShrink && onRemoveEmptySlot!(lastChip!.periodNumber)}
        className={ACTION_BTN}
        title="빈 교시 칸 제거"
        aria-label="빈 교시 칸 제거"
      >
        ×
      </button>
    </div>
  );
}
