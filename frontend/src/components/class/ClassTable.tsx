import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ClassListItem } from '../../types/class';

function teacherNames(row: ClassListItem): string {
  const t = row.teacherIds;
  if (!Array.isArray(t) || t.length === 0) return '-';
  return t.map((x) => (typeof x === 'object' && x?.name ? x.name : '-')).join(', ');
}

interface ClassTableProps {
  list: ClassListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
  emptyMessage?: string;
}

export default function ClassTable({
  list,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  readOnly = false,
  emptyMessage = '등록된 반이 없습니다.',
}: ClassTableProps) {
  const allSelected = list.length > 0 && list.every((c) => selectedIds.has(c._id));
  const someSelected = list.some((c) => selectedIds.has(c._id));
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');

  const openDeleteConfirm = (id: string, name: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetId) onDelete(deleteTargetId);
    setDeleteTargetId(null);
  };

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-slate-600 text-[13px] font-semibold">
            {!readOnly && (
              <th className="p-4 w-10">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </th>
            )}
            <th className="p-4 whitespace-nowrap">반 이름</th>
            <th className="p-4 whitespace-nowrap">담당 강사</th>
            <th className="p-4 whitespace-nowrap">소속 학생 수</th>
            <th className="p-4 text-center whitespace-nowrap">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[14px]">
          {list.length === 0 ? (
            <tr>
              <td colSpan={readOnly ? 4 : 5} className="p-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            list.map((row) => (
              <tr key={row._id} className="hover:bg-slate-50 transition-colors text-slate-700">
                {!readOnly && (
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row._id)}
                      onChange={() => onToggleSelect(row._id)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </td>
                )}
                <td className="p-4 font-medium text-slate-950 whitespace-nowrap">{row.name}</td>
                <td className="p-4 whitespace-nowrap">{teacherNames(row)}</td>
                <td className="p-4 whitespace-nowrap">{row.studentCount != null ? `${row.studentCount}명` : '-'}</td>
                <td className="p-4 text-center whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      to={`/admin/classes/${row._id}`}
                      className="inline-block px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 whitespace-nowrap"
                    >
                      상세 관리
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(row._id, row.name)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 whitespace-nowrap"
                    >
                      삭제
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onEdit(row._id)}
                        className="text-slate-400 hover:text-slate-950 whitespace-nowrap"
                      >
                        수정
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-950 mb-2">반 삭제</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-1">
              <span className="font-semibold text-slate-900">「{deleteTargetName}」</span> 반을 삭제하시겠습니까?
            </p>
            <p className="text-sm text-red-600 font-medium mb-6">
              ⚠ 삭제된 반은 복구할 수 없으며, 소속 학생·수업 데이터에 영향을 줄 수 있습니다.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
