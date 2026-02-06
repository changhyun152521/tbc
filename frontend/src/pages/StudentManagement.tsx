import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { StudentListItem, StudentFormValues } from '../types/student';
import StudentSearchFilter from '../components/student/StudentSearchFilter';
import StudentTable from '../components/student/StudentTable';
import StudentFormModal from '../components/student/StudentFormModal';
import StudentDeleteConfirmModal from '../components/student/StudentDeleteConfirmModal';
import ExcelDropdown from '../components/student/ExcelDropdown';
import ExcelBulkUploadModal from '../components/student/ExcelBulkUploadModal';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 20;

interface ListResponse {
  list: StudentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function StudentManagement() {
  const [list, setList] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<StudentFormValues | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [excelBulkOpen, setExcelBulkOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (grade) params.set('grade', grade);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      const res = await apiClient.get<{ success: boolean; data: ListResponse }>(`/admin/students?${params}`);
      if (!res.data.success || !res.data.data) throw new Error('목록 조회 실패');
      const data = res.data.data;
      setList(data.list);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러올 수 없습니다.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, grade, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(list.map((s) => s._id)));
    else setSelectedIds(new Set());
  };

  const openCreate = () => {
    setFormMode('create');
    setFormInitial(null);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = async (id: string) => {
    setEditingId(id);
    setFormMode('edit');
    try {
      const res = await apiClient.get<{ success: boolean; data: unknown }>(`/admin/students/${id}`);
      if (!res.data.success || !res.data.data) throw new Error('조회 실패');
      const d = res.data.data as Record<string, unknown>;
      const userId = d.userId as { loginId?: string } | undefined;
      const parentUserId = d.parentUserId as { loginId?: string } | undefined;
      setFormInitial({
        name: String(d.name ?? ''),
        school: String(d.school ?? ''),
        grade: String(d.grade ?? ''),
        studentPhone: String(d.studentPhone ?? ''),
        parentPhone: String(d.parentPhone ?? ''),
        studentLoginId: userId?.loginId ?? '',
        parentLoginId: parentUserId?.loginId ?? '',
        studentPassword: '',
        parentPassword: '',
      });
      setFormOpen(true);
    } catch {
      setError('학생 정보를 불러올 수 없습니다.');
    }
  };

  const handleFormSubmit = async (values: StudentFormValues) => {
    if (formMode === 'create') {
      await apiClient.post('/admin/students', values);
    } else if (editingId) {
      await apiClient.put(`/admin/students/${editingId}`, values);
    }
    fetchList();
  };

  const openDelete = (id: string) => {
    const row = list.find((s) => s._id === id);
    setDeleteTarget({ id, name: row?.name ?? '' });
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await apiClient.delete(`/admin/students/${deleteTarget.id}`);
    setDeleteOpen(false);
    setDeleteTarget(null);
    fetchList();
  };

  const downloadTemplate = () => {
    const header = '이름,학교,학년,학생 전화번호,학부모 전화번호';
    const blob = new Blob(['\uFEFF' + header], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '학생_일괄등록_양식.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleBulkRegister = async (rows: StudentFormValues[]): Promise<{ success: number; fail: number }> => {
    let success = 0;
    let fail = 0;
    for (const row of rows) {
      try {
        await apiClient.post('/admin/students', row);
        success++;
      } catch {
        fail++;
      }
    }
    return { success, fail };
  };

  const handleExport = (mode: 'all' | 'filtered' | 'selected') => {
    const toExport = mode === 'selected'
      ? list.filter((s) => selectedIds.has(s._id))
      : list;
    if (toExport.length === 0) return;
    const header = '이름,학교,학년,학생 전화번호,학부모 전화번호,소속 반 개수';
    const lines = [header, ...toExport.map((s) =>
      `"${s.name}","${s.school}","${s.grade}","${s.studentPhone}","${s.parentPhone}",${s.classCount ?? 0}`
    )];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `학생목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const hasFilter = Boolean(debouncedSearch.trim() || grade);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-title font-bold text-slate-950">학생 관리</h1>
            <p className="text-sm text-slate-500 mt-1">전체 학생 정보를 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <ExcelDropdown
              onDownloadTemplate={downloadTemplate}
              onBulkUpload={() => setExcelBulkOpen(true)}
              onExport={handleExport}
              hasSelection={selectedIds.size > 0}
              hasFilter={hasFilter}
            />
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
            >
              + 학생 추가
            </button>
          </div>
        </div>

        <div className="mb-4">
          <StudentSearchFilter
            search={search}
            grade={grade}
            onSearchChange={setSearch}
            onGradeChange={setGrade}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-500">로딩 중...</div>
          ) : (
            <StudentTable
              list={list}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          )}
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <StudentFormModal
        open={formOpen}
        mode={formMode}
        initialValues={formInitial}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <StudentDeleteConfirmModal
        open={deleteOpen}
        studentName={deleteTarget?.name}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
      />

      <ExcelBulkUploadModal
        open={excelBulkOpen}
        onClose={() => setExcelBulkOpen(false)}
        onComplete={fetchList}
        onRegister={handleBulkRegister}
      />
    </div>
  );
}
