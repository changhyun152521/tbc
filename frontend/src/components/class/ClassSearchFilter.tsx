interface ClassSearchFilterProps {
  search: string;
  onSearchChange: (v: string) => void;
}

export default function ClassSearchFilter({
  search,
  onSearchChange,
}: ClassSearchFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="반 이름으로 검색"
        className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
      />
    </div>
  );
}
