import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ClassListItem } from '../../types/class';

function teacherCount(row: ClassListItem): string {
  const n = row.teacherIds?.length ?? 0;
  return n ? `${n}명` : '-';
}

interface ClassTableProps {
  list: ClassListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ClassTable({
  list,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
}: ClassTableProps) {
  const allSelected = list.length > 0 && list.every((c) => selectedIds.has(c._id));
  const someSelected = list.some((c) => selectedIds.has(c._id));
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-slate-600 text-[13px] font-semibold">
            <th className="p-4 w-10">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
            </th>
            <th className="p-4">반 이름</th>
            <th className="p-4 whitespace-nowrap">담당 강사 수</th>
            <th className="p-4 whitespace-nowrap">소속 학생 수</th>
            <th className="p-4 text-center">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[14px]">
          {list.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-slate-500">
                등록된 반이 없습니다.
              </td>
            </tr>
          ) : (
            list.map((row) => (
              <tr key={row._id} className="hover:bg-slate-50 transition-colors text-slate-700">
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row._id)}
                    onChange={() => onToggleSelect(row._id)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                </td>
                <td className="p-4 font-medium text-slate-950">{row.name}</td>
                <td className="p-4">{teacherCount(row)}</td>
                <td className="p-4">{row.studentCount != null ? `${row.studentCount}명` : '-'}</td>
                <td className="p-4 text-center">
                  <Link
                    to={`/admin/classes/${row._id}`}
                    className="text-slate-400 hover:text-slate-950 mr-3"
                  >
                    상세 관리
                  </Link>
                  <button
                    type="button"
                    onClick={() => onEdit(row._id)}
                    className="text-slate-400 hover:text-slate-950 mr-3"
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
