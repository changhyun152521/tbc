import { useState, useEffect, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface TeacherAnnouncementItem {
  _id: string;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export default function TeacherAnnouncements() {
  const { role } = useAuth();
  const [list, setList] = useState<TeacherAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherAnnouncementItem | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ success: boolean; data: TeacherAnnouncementItem[] }>(
        '/admin/teacher-announcements'
      );
      setList(res.data.success && Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      setError('강사 공지 목록을 불러올 수 없습니다.');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role !== 'admin') return;
    void fetchList();
  }, [role]);

  if (role !== 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setBody('');
    setStartsAt('');
    setEndsAt('');
    setIsActive(true);
    setFormOpen(true);
  };

  const openEdit = (item: TeacherAnnouncementItem) => {
    setEditing(item);
    setTitle(item.title);
    setBody(item.body);
    setStartsAt(item.startsAt?.slice(0, 10) ?? '');
    setEndsAt(item.endsAt?.slice(0, 10) ?? '');
    setIsActive(item.isActive !== false);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt || !endsAt) return;
    setSaving(true);
    setError('');
    try {
      const payload = { title: title.trim(), body: body.trim(), startsAt, endsAt, isActive };
      if (editing) {
        await apiClient.put(`/admin/teacher-announcements/${editing._id}`, payload);
      } else {
        await apiClient.post('/admin/teacher-announcements', payload);
      }
      setFormOpen(false);
      await fetchList();
    } catch {
      setError('강사 공지 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 강사 공지를 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/admin/teacher-announcements/${id}`);
      await fetchList();
    } catch {
      setError('강사 공지 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-8 sm:pt-12 px-4 sm:px-6 lg:px-10 pb-16">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">강사 공지</h1>
          <p className="text-sm text-slate-500 mt-1">
            강사 로그인 시 한 번만 팝업으로 표시됩니다. 학생·학부모에게는 보이지 않습니다.
          </p>
        </div>

        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 sm:px-5 lg:px-8 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-slate-600 text-sm sm:text-base font-bold uppercase tracking-wide">
              공지 목록
            </h2>
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
            >
              공지 등록
            </button>
          </div>
          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">로딩 중...</div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">등록된 강사 공지가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto scrollbar-table">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-slate-500 text-xs font-bold">제목</th>
                    <th className="py-3 px-4 text-slate-500 text-xs font-bold whitespace-nowrap">기간</th>
                    <th className="py-3 px-4 text-slate-500 text-xs font-bold whitespace-nowrap">상태</th>
                    <th className="py-3 px-4 text-center text-slate-500 text-xs font-bold">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[14px]">
                  {list.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50 text-slate-700">
                      <td className="py-3 px-4 font-medium text-slate-950">{row.title}</td>
                      <td className="py-3 px-4 whitespace-nowrap font-number">
                        {row.startsAt} ~ {row.endsAt}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.isActive ? '활성' : '비활성'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap space-x-3">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-slate-600 hover:text-slate-950"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row._id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setFormOpen(false)}
        >
          <form
            className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleSubmit(e)}
          >
            <h3 className="text-lg font-bold text-slate-950 mb-4">
              {editing ? '강사 공지 수정' : '강사 공지 등록'}
            </h3>
            <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-3 text-slate-900"
              required
            />
            <label className="block text-sm font-medium text-slate-700 mb-1">본문</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-3 text-slate-900 resize-y"
            />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">시작일</label>
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">종료일</label>
                <input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              활성
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-700"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-slate-950 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
