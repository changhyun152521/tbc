import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { LessonDayListItem } from '../../types/lesson';

interface LessonListTableProps {
  list: LessonDayListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(d: string): string {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return String(d);
  }
}

function className(item: LessonDayListItem): string {
  if (item.className) return item.className;
  const c = item.classId;
  return typeof c === 'object' && c?.name ? c.name : '-';
}

export default function LessonListTable({
  list,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
}: LessonListTableProps) {
  const allSelected = list.length > 0 && list.every((r) => selectedIds.has(r._id));
  const someSelected = list.some((r) => selectedIds.has(r._id));
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  return (
    <div className="overflow-x-auto scrollbar-table">
      <table className="w-full text-left border-collapse min-w-[700px]">
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
            <th className="p-4">날짜</th>
            <th className="p-4">반 이름</th>
            <th className="p-4 whitespace-nowrap">등록된 교시 수</th>
            <th className="p-4 text-center">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[14px]">
          {list.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-slate-500">
                등록된 수업이 없습니다.
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
                <td className="p-4 font-mono text-slate-900">{formatDate(row.date)}</td>
                <td className="p-4 font-medium text-slate-950">{className(row)}</td>
                <td className="p-4">{row.periodCount}개 교시</td>
                <td className="p-4 text-center">
                  <Link
                    to={`/admin/lessons/${row._id}`}
                    className="text-slate-400 hover:text-slate-950 mr-3"
                  >
                    상세
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
