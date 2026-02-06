import type { StudentRecord, AttendanceHomeworkValue } from '../../types/lesson';

interface RowItem {
  studentId: string | { _id: string; name: string };
  attendance: AttendanceHomeworkValue;
  homework: AttendanceHomeworkValue;
  note?: string;
}

interface AttendanceHomeworkTableProps {
  records: RowItem[];
  onAttendanceChange: (studentId: string, value: AttendanceHomeworkValue) => void;
  onHomeworkChange: (studentId: string, value: AttendanceHomeworkValue) => void;
  onNoteChange?: (studentId: string, value: string) => void;
  disabled?: boolean;
}

function studentIdStr(r: RowItem): string {
  const s = r.studentId;
  return typeof s === 'object' && s?._id ? s._id : String(s);
}

function studentName(r: RowItem): string {
  const s = r.studentId;
  return typeof s === 'object' && s && 'name' in s ? (s as { name: string }).name : '-';
}

/** O/X 토글: 클릭 시 해당 값 선택, 이미 선택된 버튼 다시 클릭 시 선택 해제('') */
function toggleValue(current: AttendanceHomeworkValue, clickValue: 'O' | 'X'): AttendanceHomeworkValue {
  if (current === clickValue) return '';
  return clickValue;
}

const O_X: ['O', 'X'] = ['O', 'X'];

export default function AttendanceHomeworkTable({
  records,
  onAttendanceChange,
  onHomeworkChange,
  onNoteChange,
  disabled = false,
}: AttendanceHomeworkTableProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full table-auto border-collapse min-w-[320px] text-left">
        <thead>
          <tr className="text-slate-400 text-xs uppercase whitespace-nowrap">
            <th className="sticky left-0 z-10 w-12 text-center bg-white p-3 border-b border-slate-100">No.</th>
            <th className="sticky left-12 z-10 bg-white p-3 border-b border-slate-100">이름</th>
            <th className="p-3 text-center border-b border-slate-100">출석</th>
            <th className="p-3 text-center border-b border-slate-100">과제</th>
            <th className="p-3 border-b border-slate-100 min-w-[200px]">COMMENT</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-[14px]">
          {records.map((row, index) => (
            <tr key={studentIdStr(row)} className="hover:bg-slate-50/50 text-slate-700 whitespace-nowrap">
              <td className="sticky left-0 z-10 w-12 text-center p-3 text-slate-500 bg-white border-r border-slate-100">
                {index + 1}
              </td>
              <td className="sticky left-12 z-10 bg-white p-3 font-bold text-slate-950 border-r border-slate-100">
                {studentName(row)}
              </td>
              <td className="p-3">
                <div className="flex justify-center gap-1">
                  {O_X.map((v) => {
                    const isSelected = (row.attendance || '') === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={disabled}
                        onClick={() => onAttendanceChange(studentIdStr(row), toggleValue(row.attendance || '', v))}
                        className={`w-7 h-7 rounded-full border-2 text-xs font-medium transition-all shrink-0 ${
                          isSelected
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </td>
              <td className="p-3">
                <div className="flex justify-center gap-1">
                  {O_X.map((v) => {
                    const isSelected = (row.homework || '') === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={disabled}
                        onClick={() => onHomeworkChange(studentIdStr(row), toggleValue(row.homework || '', v))}
                        className={`w-7 h-7 rounded-full border-2 text-xs font-medium transition-all shrink-0 ${
                          isSelected
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </td>
              <td className="p-3 min-w-[200px]">
                {onNoteChange ? (
                  <input
                    type="text"
                    value={row.note ?? ''}
                    onChange={(e) => onNoteChange(studentIdStr(row), e.target.value)}
                    disabled={disabled}
                    placeholder="선택 입력"
                    className="w-full min-w-[200px] sm:min-w-[280px] bg-slate-50 border border-slate-100 rounded-lg text-sm px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-300 outline-none disabled:bg-slate-100"
                  />
                ) : (
                  <span className="text-slate-500">{(row.note ?? '') || '-'}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
