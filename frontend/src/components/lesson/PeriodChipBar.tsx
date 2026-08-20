export type PeriodChipStatus = 'empty' | 'mine' | 'other';

export interface PeriodChipItem {
  periodNumber: number;
  status: PeriodChipStatus;
  teacherName?: string;
  periodIndex?: number;
}

interface PeriodChipBarProps {
  chips: PeriodChipItem[];
  selectedPeriodNumber: number | null;
  onSelect: (periodNumber: number) => void;
  onAddAt: (periodNumber: number) => void;
  onExtendSlots: () => void;
  adding?: boolean;
}

export default function PeriodChipBar({
  chips,
  selectedPeriodNumber,
  onSelect,
  onAddAt,
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
              <button
                key={chip.periodNumber}
                type="button"
                disabled={adding}
                onClick={() => onAddAt(chip.periodNumber)}
                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  selected
                    ? 'border-slate-400 bg-slate-100 text-slate-800'
                    : 'border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                {chip.periodNumber}교시 · 비어있음
              </button>
            );
          }
          const isMine = chip.status === 'mine';
          return (
            <button
              key={chip.periodNumber}
              type="button"
              onClick={() => onSelect(chip.periodNumber)}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                selected
                  ? isMine
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-600 bg-slate-700 text-white'
                  : isMine
                    ? 'border-slate-800 bg-white text-slate-900 hover:bg-slate-50'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {chip.periodNumber}교시 · {chip.teacherName}
              {isMine ? ' (나)' : ''}
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
