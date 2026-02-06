import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { ClassListItem, ClassFormValues } from '../types/class';
import ClassSearchFilter from '../components/class/ClassSearchFilter';
import ClassTable from '../components/class/ClassTable';
import ClassFormModal from '../components/class/ClassFormModal';
import ClassDeleteConfirmModal from '../components/class/ClassDeleteConfirmModal';
import ExcelDropdown from '../components/student/ExcelDropdown';
import ClassExcelBulkUploadModal from '../components/class/ClassExcelBulkUploadModal';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 20;

function filterClasses(list: ClassListItem[], search: string): ClassListItem[] {
  const q = search.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => c.name?.toLowerCase().includes(q));
}

export default function ClassManagement() {
  const [rawList, setRawList] = useState<ClassListItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<ClassFormValues | null>(null);

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
      const res = await apiClient.get<{ success: boolean; data: ClassListItem[] }>('/admin/classes');
      if (!res.data.success || !Array.isArray(res.data.data)) throw new Error('목록 조회 실패');
      setRawList(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러올 수 없습니다.');
      setRawList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filteredList = filterClasses(rawList, debouncedSearch);
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const list = filteredList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(list.map((c) => c._id)));
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
      const res = await apiClient.get<{ success: boolean; data: ClassListItem }>(`/admin/classes/${id}`);
      if (!res.data.success || !res.data.data) throw new Error('조회 실패');
      const d = res.data.data;
      setFormInitial({
        name: String(d.name ?? ''),
        teacherIds: [],
        description: String(d.description ?? ''),
      });
      setFormOpen(true);
    } catch {
      setError('반 정보를 불러올 수 없습니다.');
    }
  };

  const handleFormSubmit = async (values: ClassFormValues) => {
    if (formMode === 'create') {
      await apiClient.post('/admin/classes', {
        name: values.name,
        description: values.description ?? '',
      });
    } else if (editingId) {
      await apiClient.put(`/admin/classes/${editingId}`, {
        name: values.name,
        description: values.description ?? '',
      });
    }
    fetchList();
  };

  const openDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    await apiClient.delete(`/admin/classes/${deleteTargetId}`);
    setDeleteOpen(false);
    setDeleteTargetId(null);
    fetchList();
  };

  const downloadTemplate = () => {
    const header = '반 이름,비고';
    const blob = new Blob(['\uFEFF' + header], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '반_일괄등록_양식.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleBulkRegister = async (rows: { name: string; description?: string }[]): Promise<{ success: number; fail: number }> => {
    let success = 0;
    let fail = 0;
    for (const row of rows) {
      try {
        await apiClient.post('/admin/classes', { name: row.name.trim(), description: row.description?.trim() ?? '' });
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
        ? rawList.filter((c) => selectedIds.has(c._id))
        : mode === 'filtered'
          ? filteredList
          : rawList;
    if (toExport.length === 0) return;
    const teacherStr = (c: ClassListItem) => {
      const t = c.teacherIds ?? [];
      return t.length === 0 ? '' : t.map((x: { name: string }) => x.name).join(', ');
    };
    const header = '반 이름,담당 강사,소속 학생 수,생성일,비고';
    const lines = [
      header,
      ...toExport.map((c) =>
        `"${c.name}","${teacherStr(c)}",${c.studentCount ?? 0},"${c.createdAt ?? ''}","${c.description ?? ''}"`
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `반목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const hasFilter = Boolean(debouncedSearch.trim());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-title font-bold text-slate-950">반 관리</h1>
            <p className="text-sm text-slate-500 mt-1">전체 반 정보를 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <ExcelDropdown
              onDownloadTemplate={downloadTemplate}
              onBulkUpload={() => setExcelBulkOpen(true)}
              onExport={handleExport}
              hasSelection={selectedIds.size > 0}
              hasFilter={hasFilter}
              selectionLabel="선택한 반만 다운로드"
            />
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
            >
              + 반 추가
            </button>
          </div>
        </div>

        <div className="mb-4">
          <ClassSearchFilter search={search} onSearchChange={setSearch} />
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
            <ClassTable
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

      <ClassFormModal
        open={formOpen}
        mode={formMode}
        initialValues={formInitial}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <ClassDeleteConfirmModal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      <ClassExcelBulkUploadModal
        open={excelBulkOpen}
        onClose={() => setExcelBulkOpen(false)}
        onComplete={fetchList}
        onRegister={handleBulkRegister}
      />
    </div>
  );
}
