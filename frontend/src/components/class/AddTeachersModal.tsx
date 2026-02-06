import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';

interface TeacherOption {
  _id: string;
  name: string;
}

interface AddTeachersModalProps {
  open: boolean;
  classId: string;
  /** 이미 이 반에 연결된 강사 ID (체크 상태로 표시) */
  currentTeacherIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddTeachersModal({
  open,
  classId,
  currentTeacherIds,
  onClose,
  onAdded,
}: AddTeachersModalProps) {
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setError('');
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: TeacherOption[] }>('/admin/teachers');
        if (cancelled) return;
        if (res.data.success && Array.isArray(res.data.data)) {
          setTeachers(res.data.data);
        } else {
          setTeachers([]);
        }
      } catch {
        if (!cancelled) setTeachers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const toAdd = teachers.filter((t) => selectedIds.has(t._id) && !currentTeacherIds.has(t._id));
  const allSelected = teachers.length > 0 && teachers.every((t) => currentTeacherIds.has(t._id) || selectedIds.has(t._id));
  const selectable = teachers.filter((t) => !currentTeacherIds.has(t._id));
  const someSelected = selectable.length > 0 && selectable.some((t) => selectedIds.has(t._id)) && !allSelected;

  const allSelectedRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = allSelectedRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const toggleOne = (id: string) => {
    if (currentTeacherIds.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(teachers.filter((t) => !currentTeacherIds.has(t._id)).map((t) => t._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSubmit = async () => {
    if (toAdd.length === 0) {
      setError('추가할 강사를 선택하세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      for (const teacher of toAdd) {
        await apiClient.post(`/admin/classes/${classId}/teachers`, { teacherId: teacher._id });
      }
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div
        className="flex flex-col max-h-[85vh] w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-950">강사 추가</h2>
          <p className="text-sm text-slate-500 mt-1">반에 연결할 담당 강사를 선택하세요.</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-slate-500">강사 목록 로딩 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[13px] font-semibold">
                    <th className="p-3 w-10">
                      <input
                        ref={allSelectedRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </th>
                    <th className="p-3">이름</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-6 text-center text-slate-500">
                        등록된 강사가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    teachers.map((t) => {
                      const isCurrent = currentTeacherIds.has(t._id);
                      return (
                        <tr key={t._id} className="hover:bg-slate-50 text-slate-700">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isCurrent || selectedIds.has(t._id)}
                              onChange={() => toggleOne(t._id)}
                              disabled={isCurrent}
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                          </td>
                          <td className="p-3 font-medium text-slate-950">
                            {t.name}
                            {isCurrent && <span className="text-slate-400 text-xs ml-2">(이미 연결됨)</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
        </div>
        <div className="shrink-0 p-4 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || toAdd.length === 0 || submitting}
            className="flex-1 py-2.5 bg-slate-950 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? '추가 중...' : `선택 강사 반에 추가 (${toAdd.length}명)`}
          </button>
        </div>
      </div>
    </div>
  );
}
