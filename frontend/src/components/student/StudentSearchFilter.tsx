import { GRADE_OPTIONS } from '../../types/student';

interface StudentSearchFilterProps {
  search: string;
  grade: string;
  onSearchChange: (v: string) => void;
  onGradeChange: (v: string) => void;
}

export default function StudentSearchFilter({
  search,
  grade,
  onSearchChange,
  onGradeChange,
}: StudentSearchFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="이름, 학교, 전화번호로 검색"
        className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
      />
      <select
        value={grade}
        onChange={(e) => onGradeChange(e.target.value)}
        className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-[14px] text-slate-700 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
      >
        {GRADE_OPTIONS.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
