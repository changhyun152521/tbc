interface DateNavigatorProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
}

export default function DateNavigator({ value, onChange, className = '' }: DateNavigatorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="shrink-0 text-xs font-bold text-slate-500 uppercase tracking-wide">
        날짜
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[42px] px-4 py-2.5 box-border bg-white border border-slate-200 rounded-lg text-[14px] text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
      />
    </div>
  );
}
