import type { ClassListItem } from '../../types/class';

interface TeacherOption {
  _id: string;
  name: string;
}

interface LessonFilterProps {
  dateFrom: string;
  dateTo: string;
  classId: string;
  teacherId: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onClassIdChange: (v: string) => void;
  onTeacherIdChange: (v: string) => void;
  onSearch: () => void;
  classOptions: ClassListItem[] | { _id: string; name: string }[];
  teacherOptions: TeacherOption[] | { _id: string; name: string }[];
}

export default function LessonFilter({
  dateFrom,
  dateTo,
  classId,
  teacherId,
  onDateFromChange,
  onDateToChange,
  onClassIdChange,
  onTeacherIdChange,
  onSearch,
  classOptions,
  teacherOptions,
}: LessonFilterProps) {
  const inputClass =
    'px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className={inputClass}
        title="시작일"
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className={inputClass}
        title="종료일"
      />
      <select value={classId} onChange={(e) => onClassIdChange(e.target.value)} className={`${inputClass} text-slate-700`}>
        <option value="">반 전체</option>
        {classOptions.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>
      <select value={teacherId} onChange={(e) => onTeacherIdChange(e.target.value)} className={`${inputClass} text-slate-700`}>
        <option value="">강사 전체</option>
        {teacherOptions.map((t) => (
          <option key={t._id} value={t._id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onSearch}
        className="px-4 py-2.5 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
      >
        검색
      </button>
    </div>
  );
}
