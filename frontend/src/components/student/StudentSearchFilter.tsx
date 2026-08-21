import { GRADE_OPTIONS } from '../../types/student';

export interface ClassFilterOption {
  _id: string;
  name: string;
}

interface StudentSearchFilterProps {
  search: string;
  grade: string;
  onSearchChange: (v: string) => void;
  onGradeChange: (v: string) => void;
  /** 빈 문자열=전체, 'my'=내 반 전체, 그 외=반 ID */
  classFilter?: string;
  onClassFilterChange?: (v: string) => void;
  classOptions?: ClassFilterOption[];
  showMyClassesOption?: boolean;
}

export default function StudentSearchFilter({
  search,
  grade,
  onSearchChange,
  onGradeChange,
  classFilter = '',
  onClassFilterChange,
  classOptions,
  showMyClassesOption = false,
}: StudentSearchFilterProps) {
  const showClassFilter = Boolean(onClassFilterChange && classOptions);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="이름, 학교, 전화번호로 검색"
        className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
      />
      {showClassFilter && (
        <select
          value={classFilter}
          onChange={(e) => onClassFilterChange?.(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-[14px] text-slate-700 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none min-w-[140px]"
        >
          <option value="">전체 학생</option>
          {showMyClassesOption && <option value="my">내 반 전체</option>}
          {classOptions!.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
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
