import { useEffect, useRef } from 'react';
import type { StudentListItem } from '../../types/student';
import { formatLastAccess } from '../../utils/formatLastAccess';

interface StudentTableProps {
  list: StudentListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  showLastAccess?: boolean;
}

export default function StudentTable({
  list,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  showLastAccess = false,
}: StudentTableProps) {
  const allSelected = list.length > 0 && list.every((s) => selectedIds.has(s._id));
  const someSelected = list.some((s) => selectedIds.has(s._id));
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  return (
    <div className="overflow-x-auto scrollbar-table">
      <table className="w-full text-left border-collapse min-w-[1060px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-slate-600 text-[13px] font-semibold">
            <th className="p-3 w-10 shrink-0">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
            </th>
            <th className="p-3 min-w-[68px] whitespace-nowrap">이름</th>
            <th className="p-3 min-w-[76px] whitespace-nowrap">학교</th>
            <th className="p-3 min-w-[44px] whitespace-nowrap">학년</th>
            <th className="p-3 min-w-[98px] whitespace-nowrap">학생 전화번호</th>
            <th className="p-3 min-w-[98px] whitespace-nowrap">학부모 전화번호</th>
            <th className="p-3 min-w-[112px] whitespace-nowrap">관리 접속 ID</th>
            <th className="p-3 min-w-[88px] whitespace-nowrap">소속 반</th>
            {showLastAccess && (
              <>
                <th className="p-3 min-w-[96px] whitespace-nowrap">학생 접속</th>
                <th className="p-3 min-w-[96px] whitespace-nowrap">학부모 접속</th>
              </>
            )}
            <th className="p-3 min-w-[84px] text-center whitespace-nowrap">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[14px]">
          {list.length === 0 ? (
            <tr>
              <td colSpan={showLastAccess ? 11 : 9} className="p-8 text-center text-slate-500">
                등록된 학생이 없습니다.
              </td>
            </tr>
          ) : (
            list.map((row) => (
              <tr key={row._id} className="hover:bg-slate-50 transition-colors text-slate-700">
                <td className="p-3 w-10 shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row._id)}
                    onChange={() => onToggleSelect(row._id)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                </td>
                <td className="p-3 font-medium text-slate-950 whitespace-nowrap">{row.name}</td>
                <td className="p-3 whitespace-nowrap">{row.school}</td>
                <td className="p-3 whitespace-nowrap">{row.grade}</td>
                <td className="p-3 font-number whitespace-nowrap">{row.studentPhone}</td>
                <td className="p-3 font-number whitespace-nowrap">{row.parentPhone}</td>
                <td className="p-3 text-slate-600 font-medium whitespace-nowrap">{row.adminAccessLoginId ?? '-'}</td>
                <td className="p-3 text-slate-500 whitespace-nowrap">{row.classCount != null ? `${row.classCount}개 반 소속` : '-'}</td>
                {showLastAccess && (
                  <>
                    <td className="p-3 text-slate-500 whitespace-nowrap" title={row.lastAccessAt ?? undefined}>
                      {formatLastAccess(row.lastAccessAt)}
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap" title={row.parentLastAccessAt ?? undefined}>
                      {formatLastAccess(row.parentLastAccessAt)}
                    </td>
                  </>
                )}
                <td className="p-3 text-center whitespace-nowrap shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(row._id)}
                    className="text-slate-400 hover:text-slate-950 mr-2"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(row._id)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
