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

export default function PeriodChipBar({
  chips,
  selectedPeriodNumber,
  onSelect,
  onRemoveEmptySlot,
  onExtendSlots,
  adding = false,
}: PeriodChipBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const selected = selectedPeriodNumber === chip.periodNumber;
          if (chip.status === 'empty') {
            return (
              <div key={chip.periodNumber} className="relative inline-flex">
                <button
                  type="button"
                  disabled={adding}
                  onClick={() => onSelect(chip.periodNumber)}
                  className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    selected
                      ? 'border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-300'
                      : 'border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {chip.periodNumber}교시 · 비어있음
                </button>
                {chip.removable && onRemoveEmptySlot && (
                  <button
                    type="button"
                    disabled={adding}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveEmptySlot(chip.periodNumber);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-600 text-white text-xs leading-none hover:bg-slate-800 disabled:opacity-50"
                    title="빈 교시 칸 제거"
                    aria-label={`${chip.periodNumber}교시 빈 칸 제거`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          }
          if (chip.status === 'other') {
            return (
              <button
                key={chip.periodNumber}
                type="button"
                onClick={() => onSelect(chip.periodNumber)}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-colors shadow-sm ${
                  selected
                    ? 'border-amber-500 bg-amber-500 text-white ring-2 ring-amber-300'
                    : 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  다른 강사
                </span>
                {chip.periodNumber}교시 · {chip.teacherName}
              </button>
            );
          }
          return (
            <button
              key={chip.periodNumber}
              type="button"
              onClick={() => onSelect(chip.periodNumber)}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                selected
                  ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-400'
                  : 'border-slate-800 bg-white text-slate-900 hover:bg-slate-50'
              }`}
            >
              {chip.periodNumber}교시 · {chip.teacherName} (나)
            </button>
          );
        })}
        <button
          type="button"
          disabled={adding}
          onClick={onExtendSlots}
          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          title="교시 칸 추가"
        >
          +
        </button>
      </div>
    </div>
  );
}
