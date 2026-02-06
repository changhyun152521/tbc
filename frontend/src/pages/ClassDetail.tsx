import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ClassDetail as ClassDetailType, ClassStudentItem } from '../types/class';
import AddStudentsModal from '../components/class/AddStudentsModal';
import AddTeachersModal from '../components/class/AddTeachersModal';

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ClassDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addTeachersOpen, setAddTeachersOpen] = useState(false);
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ success: boolean; data: ClassDetailType }>(`/admin/classes/${id}`);
      if (!res.data.success || !res.data.data) throw new Error('반 정보를 불러올 수 없습니다.');
      setDetail(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '반 정보를 불러올 수 없습니다.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!id) return;
    try {
      await apiClient.delete(`/admin/classes/${id}/teachers?teacherId=${encodeURIComponent(teacherId)}`);
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : '강사 연결 해제에 실패했습니다.');
    }
  };

  const handleRemoveFromClass = async (studentId: string) => {
    if (!id) return;
    try {
      await apiClient.delete(`/admin/classes/${id}/students?studentId=${encodeURIComponent(studentId)}`);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(studentId); return n; });
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : '학생 제거에 실패했습니다.');
    }
  };

  const handleBulkRemove = async () => {
    if (!id || selectedIds.size === 0) return;
    for (const studentId of selectedIds) {
      try {
        await apiClient.delete(`/admin/classes/${id}/students?studentId=${encodeURIComponent(studentId)}`);
      } catch {
        // continue
      }
    }
    setSelectedIds(new Set());
    await fetchDetail();
  };

  const toggleSelect = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(students.map((s) => s._id)));
    else setSelectedIds(new Set());
  };

  const teachers = (detail?.teacherIds ?? []) as { _id: string; name: string }[];
  const currentTeacherIds = new Set(teachers.map((t) => t._id));
  const excludeStudentIds = new Set((detail?.studentIds ?? []).map((s) => s._id));
  const students: ClassStudentItem[] = (detail?.studentIds ?? []) as ClassStudentItem[];
  const allSelected = students.length > 0 && students.every((s) => selectedIds.has(s._id));

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="w-full max-w-6xl mx-auto">
          <p className="text-slate-600">반 ID가 없습니다.</p>
          <Link to="/admin/classes" className="text-slate-900 font-medium mt-2 inline-block">목록으로</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="w-full max-w-6xl mx-auto">
          <div className="p-12 text-center text-slate-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="w-full max-w-6xl mx-auto">
          <p className="text-red-600">{error}</p>
          <Link to="/admin/classes" className="text-slate-900 font-medium mt-2 inline-block">목록으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-6 pb-12">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
        <div>
          <Link
            to="/admin/classes"
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← 반 목록
          </Link>
          <h1 className="text-2xl font-title font-bold text-slate-950">{detail?.name ?? '-'}</h1>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        {/* 1. 반 기본 정보 */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-slate-600 text-sm sm:text-base font-bold uppercase tracking-wide mb-2">반 기본 정보</h2>
          <p className="text-slate-800">{detail?.name ?? '-'}</p>
          {detail?.description && (
            <p className="text-sm text-slate-500 mt-2">{detail.description}</p>
          )}
        </section>

        {/* 2. 담당 강사 관리 */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 sm:px-5 lg:px-8 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-slate-600 text-sm sm:text-base font-bold uppercase tracking-wide">담당 강사 관리</h2>
            <button
              type="button"
              onClick={() => setAddTeachersOpen(true)}
              className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
            >
              강사 추가
            </button>
          </div>
          <div className="overflow-x-auto scrollbar-table">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-slate-500 text-xs font-bold">이름</th>
                  <th className="py-3 px-4 text-center text-slate-500 text-xs font-bold">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[14px]">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-slate-400">
                      담당 강사가 없습니다. 강사 추가 버튼으로 연결하세요.
                    </td>
                  </tr>
                ) : (
                  teachers.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50 text-slate-700">
                      <td className="py-3 px-4 font-medium text-slate-950">{t.name}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveTeacher(t._id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          반에서 제거
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. 소속 학생 관리 */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 sm:px-5 lg:px-8 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-slate-600 text-sm sm:text-base font-bold uppercase tracking-wide">소속 학생 관리</h2>
            <button
              type="button"
              onClick={() => setAddStudentsOpen(true)}
              className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
            >
              학생 추가
            </button>
          </div>
          {selectedIds.size > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkRemove}
                className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                선택 학생 반에서 제거 ({selectedIds.size}명)
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                선택 해제
              </button>
            </div>
          )}
          <div className="overflow-x-auto scrollbar-table">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="py-3 px-4 text-slate-500 text-xs font-bold">이름</th>
                  <th className="py-3 px-4 text-slate-500 text-xs font-bold">학교</th>
                  <th className="py-3 px-4 text-slate-500 text-xs font-bold">학년</th>
                  <th className="py-3 px-4 whitespace-nowrap text-slate-500 text-xs font-bold">학생 전화번호</th>
                  <th className="py-3 px-4 whitespace-nowrap text-slate-500 text-xs font-bold">학부모 전화번호</th>
                  <th className="py-3 px-4 text-center text-slate-500 text-xs font-bold">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[14px]">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      소속 학생이 없습니다. 학생 추가 버튼으로 추가하세요.
                    </td>
                  </tr>
                ) : (
                  students.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50 transition-colors text-slate-700">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row._id)}
                          onChange={() => toggleSelect(row._id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-950">{row.name}</td>
                      <td className="py-3 px-4">{row.school}</td>
                      <td className="py-3 px-4">{row.grade}</td>
                      <td className="py-3 px-4 font-number">{row.studentPhone}</td>
                      <td className="py-3 px-4 font-number">{row.parentPhone}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveFromClass(row._id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          반에서 제거
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AddTeachersModal
        open={addTeachersOpen}
        classId={id}
        currentTeacherIds={currentTeacherIds}
        onClose={() => setAddTeachersOpen(false)}
        onAdded={fetchDetail}
      />
      <AddStudentsModal
        open={addStudentsOpen}
        classId={id}
        excludeStudentIds={excludeStudentIds}
        onClose={() => setAddStudentsOpen(false)}
        onAdded={fetchDetail}
      />
    </div>
  );
}
