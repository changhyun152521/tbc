import { useEffect, useRef, useState } from 'react';
import type { StudentListItem } from '../../types/student';
import { formatLastAccess } from '../../utils/formatLastAccess';
import { apiClient } from '../../api/client';

interface StudentTableProps {
  list: StudentListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onResetDone?: () => void;
  showStudentLastAccess?: boolean;
  showParentLastAccess?: boolean;
  showLoginIds?: boolean;
  showResetCredentials?: boolean;
}

export default function StudentTable({
  list,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onResetDone,
  showStudentLastAccess = false,
  showParentLastAccess = false,
  showLoginIds = false,
  showResetCredentials = false,
}: StudentTableProps) {
  const allSelected = list.length > 0 && list.every((s) => selectedIds.has(s._id));
  const someSelected = list.some((s) => selectedIds.has(s._id));
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const accessColumnCount = (showStudentLastAccess ? 1 : 0) + (showParentLastAccess ? 1 : 0);
  const loginColumnCount = showLoginIds ? 2 : 0;
  const colSpan = 9 + accessColumnCount + loginColumnCount;

  const handleReset = async (row: StudentListItem, target: 'student' | 'parent' | 'both') => {
    const label =
      target === 'student' ? '학생' : target === 'parent' ? '학부모' : '학생·학부모';
    const ok = window.confirm(
      `${row.name} 학생의 ${label} 계정을 전화번호로 초기화할까요?\n아이디·비밀번호가 전화번호로 돌아가며, 다음 로그인 시 변경이 필요합니다.`
    );
    if (!ok) return;
    setResettingId(`${row._id}-${target}`);
    try {
      const res = await apiClient.post<{ success: boolean; message?: string }>(
        `/admin/students/${row._id}/reset-credentials`,
        { target }
      );
      if (res.data.success) {
        window.alert(res.data.message ?? '초기화되었습니다.');
        onResetDone?.();
      } else {
        window.alert(res.data.message ?? '초기화에 실패했습니다.');
      }
    } catch (err: unknown) {
      const msg =
        typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : '초기화에 실패했습니다.';
      window.alert(msg);
    } finally {
      setResettingId(null);
    }
  };

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
            {showLoginIds && <th className="p-3 min-w-[100px] whitespace-nowrap">학생 ID</th>}
            {showLoginIds && <th className="p-3 min-w-[100px] whitespace-nowrap">학부모 ID</th>}
            <th className="p-3 min-w-[112px] whitespace-nowrap">관리 접속 ID</th>
            <th className="p-3 min-w-[88px] whitespace-nowrap">소속 반</th>
            {showStudentLastAccess && <th className="p-3 min-w-[96px] whitespace-nowrap">학생 접속</th>}
            {showParentLastAccess && <th className="p-3 min-w-[96px] whitespace-nowrap">학부모 접속</th>}
            <th className="p-3 min-w-[120px] text-center whitespace-nowrap">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[14px]">
          {list.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="p-8 text-center text-slate-500">
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
                {showLoginIds && (
                  <td className="p-3 text-slate-600 font-medium whitespace-nowrap">{row.studentLoginId ?? '-'}</td>
                )}
                {showLoginIds && (
                  <td className="p-3 text-slate-600 font-medium whitespace-nowrap">{row.parentLoginId ?? '-'}</td>
                )}
                <td className="p-3 text-slate-600 font-medium whitespace-nowrap">{row.adminAccessLoginId ?? '-'}</td>
                <td className="p-3 text-slate-500 whitespace-nowrap">{row.classCount != null ? `${row.classCount}개 반 소속` : '-'}</td>
                {showStudentLastAccess && (
                  <td className="p-3 text-slate-500 whitespace-nowrap" title={row.lastAccessHidden ? undefined : row.lastAccessAt ?? undefined}>
                    {row.lastAccessHidden ? '-' : formatLastAccess(row.lastAccessAt)}
                  </td>
                )}
                {showParentLastAccess && (
                  <td className="p-3 text-slate-500 whitespace-nowrap" title={row.parentLastAccessAt ?? undefined}>
                    {row.parentLastAccessHidden ? '-' : formatLastAccess(row.parentLastAccessAt)}
                  </td>
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
                    className="text-slate-400 hover:text-red-600 mr-2"
                  >
                    삭제
                  </button>
                  {showResetCredentials && (
                    <button
                      type="button"
                      disabled={resettingId != null}
                      onClick={() => void handleReset(row, 'both')}
                      className="text-slate-400 hover:text-amber-700 disabled:opacity-50"
                      title="학생·학부모 계정을 전화번호로 초기화"
                    >
                      {resettingId?.startsWith(row._id) ? '초기화중' : '초기화'}
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
