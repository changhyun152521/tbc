import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import type { StudentListItem } from '../../types/student';
import StudentSearchFilter from '../student/StudentSearchFilter';

interface AddStudentsModalProps {
  open: boolean;
  classId: string;
  /** 이미 이 반에 소속된 학생 ID (제외용) */
  excludeStudentIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddStudentsModal({
  open,
  classId,
  excludeStudentIds,
  onClose,
  onAdded,
}: AddStudentsModalProps) {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const allSelectedRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setError('');
    setSearch('');
    setGrade('');
    setDebouncedSearch('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (grade) params.set('grade', grade);
        params.set('limit', '1000');
        params.set('page', '1');
        const res = await apiClient.get<{ success: boolean; data: { list: StudentListItem[] } }>(
          `/admin/students?${params}`
        );
        if (cancelled) return;
        const payload = res.data?.data;
        if (payload && typeof payload === 'object' && 'list' in payload && Array.isArray(payload.list)) {
          setStudents(payload.list);
        } else {
          setStudents([]);
        }
      } catch {
        if (!cancelled) setStudents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, debouncedSearch, grade]);

  const available = students.filter((s) => !excludeStudentIds.has(s._id));
  const allSelected = available.length > 0 && available.every((s) => selectedIds.has(s._id));
  const someSelected = available.length > 0 && available.some((s) => selectedIds.has(s._id)) && !allSelected;

  useEffect(() => {
    const el = allSelectedRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(available.map((s) => s._id)));
    else setSelectedIds(new Set());
  };

  const handleSubmit = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setError('추가할 학생을 선택하세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post(`/admin/classes/${classId}/students`, { studentIds: ids });
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
        className="flex flex-col max-h-[85vh] w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-950">학생 추가</h2>
          <p className="text-sm text-slate-500 mt-1">반에 추가할 학생을 선택하세요.</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="mb-4">
            <StudentSearchFilter
              search={search}
              grade={grade}
              onSearchChange={setSearch}
              onGradeChange={setGrade}
            />
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-500">학생 목록 로딩 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px] min-w-[600px]">
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
                    <th className="p-3">학교</th>
                    <th className="p-3">학년</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {available.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">
                        추가할 수 있는 학생이 없습니다. (이미 이 반에 소속된 학생은 제외됩니다.)
                      </td>
                    </tr>
                  ) : (
                    available.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50 text-slate-700">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(s._id)}
                            onChange={() => toggleOne(s._id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </td>
                        <td className="p-3 font-medium text-slate-950">{s.name}</td>
                        <td className="p-3">{s.school}</td>
                        <td className="p-3">{s.grade}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>
          )}
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
            disabled={loading || selectedIds.size === 0 || submitting}
            className="flex-1 py-2.5 bg-slate-950 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? '추가 중...' : `선택 학생 반에 추가 (${selectedIds.size}명)`}
          </button>
        </div>
      </div>
    </div>
  );
}
