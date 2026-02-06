import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { TeacherListItem, TeacherFormValues, TeacherExcelRow } from '../types/teacher';
import TeacherSearchFilter from '../components/teacher/TeacherSearchFilter';
import TeacherTable from '../components/teacher/TeacherTable';
import TeacherFormModal from '../components/teacher/TeacherFormModal';
import TeacherDeleteConfirmModal from '../components/teacher/TeacherDeleteConfirmModal';
import ExcelDropdown from '../components/student/ExcelDropdown';
import TeacherExcelBulkUploadModal from '../components/teacher/TeacherExcelBulkUploadModal';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 20;

function getLoginId(row: TeacherListItem): string {
  return row.loginId ?? (row.userId as { loginId?: string } | undefined)?.loginId ?? '';
}

function getPhone(row: TeacherListItem): string {
  return row.phone ?? (row.userId as { phone?: string } | undefined)?.phone ?? '';
}

export default function TeacherManagement() {
  const [list, setList] = useState<TeacherListItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<TeacherFormValues | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
      const res = await apiClient.get<{ success: boolean; data: TeacherListItem[] }>(
        `/admin/teachers?${params}`
      );
      if (!res.data.success || !Array.isArray(res.data.data)) throw new Error('목록 조회 실패');
      setList(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러올 수 없습니다.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const paginatedList = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(paginatedList.map((t) => t._id)));
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
      const res = await apiClient.get<{
        success: boolean;
        data: TeacherListItem & { userId?: { loginId?: string; phone?: string }; description?: string };
      }>(`/admin/teachers/${id}`);
      if (!res.data.success || !res.data.data) throw new Error('조회 실패');
      const d = res.data.data;
      const uid = d.userId as { loginId?: string; phone?: string } | undefined;
      setFormInitial({
        name: String(d.name ?? ''),
        loginId: String(uid?.loginId ?? ''),
        password: '',
        phone: String(uid?.phone ?? ''),
        description: String((d as { description?: string }).description ?? ''),
      });
      setFormOpen(true);
    } catch {
      setError('강사 정보를 불러올 수 없습니다.');
    }
  };

  const handleFormSubmit = async (values: TeacherFormValues) => {
    if (formMode === 'create') {
      await apiClient.post('/admin/teachers', {
        name: values.name,
        loginId: values.loginId,
        password: values.password,
        phone: values.phone || undefined,
        description: values.description || undefined,
      });
    } else if (editingId) {
      const body: Record<string, string> = {
        name: values.name,
        phone: values.phone ?? '',
        description: values.description ?? '',
      };
      if (values.loginId) body.loginId = values.loginId;
      if (values.password?.trim()) body.password = values.password.trim();
      await apiClient.put(`/admin/teachers/${editingId}`, body);
    }
    fetchList();
  };

  const openDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    await apiClient.delete(`/admin/teachers/${deleteTargetId}`);
    setDeleteOpen(false);
    setDeleteTargetId(null);
    fetchList();
  };

  const downloadTemplate = () => {
    const header = '이름,로그인 ID,비밀번호,전화번호,비고';
    const blob = new Blob(['\uFEFF' + header], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '강사_일괄등록_양식.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleBulkRegister = async (
    rows: TeacherExcelRow[]
  ): Promise<{ success: number; fail: number }> => {
    let success = 0;
    let fail = 0;
    for (const row of rows) {
      try {
        await apiClient.post('/admin/teachers', {
          name: row.name.trim(),
          loginId: row.loginId.trim(),
          password: row.password,
          phone: row.phone?.trim() || '',
          description: row.description?.trim() || '',
        });
        success++;
      } catch {
        fail++;
      }
    }
    return { success, fail };
  };

  const handleExport = (mode: 'all' | 'filtered' | 'selected') => {
    const toExport =
      mode === 'selected'
        ? list.filter((t) => selectedIds.has(t._id))
        : list;
    if (toExport.length === 0) return;
    const header = '이름,로그인 ID,전화번호,담당 반 개수,비고';
    const lines = [
      header,
      ...toExport.map((t) =>
        `"${t.name}","${getLoginId(t)}","${getPhone(t)}",${t.classCount ?? 0},"${(t as TeacherListItem & { description?: string }).description ?? ''}"`
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `강사목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const hasFilter = Boolean(debouncedSearch.trim());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-title font-bold text-slate-950">강사 관리</h1>
            <p className="text-sm text-slate-500 mt-1">전체 강사 정보를 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <ExcelDropdown
              onDownloadTemplate={downloadTemplate}
              onBulkUpload={() => setExcelBulkOpen(true)}
              onExport={handleExport}
              hasSelection={selectedIds.size > 0}
              hasFilter={hasFilter}
              selectionLabel="선택한 강사만 다운로드"
            />
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
            >
              + 강사 추가
            </button>
          </div>
        </div>

        <div className="mb-4">
          <TeacherSearchFilter search={search} onSearchChange={setSearch} />
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
            <TeacherTable
              list={paginatedList}
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

      <TeacherFormModal
        open={formOpen}
        mode={formMode}
        initialValues={formInitial}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <TeacherDeleteConfirmModal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      <TeacherExcelBulkUploadModal
        open={excelBulkOpen}
        onClose={() => setExcelBulkOpen(false)}
        onComplete={fetchList}
        onRegister={handleBulkRegister}
      />
    </div>
  );
}
