import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ClassListItemForTest } from '../types/class';

export default function TestManagement() {
  const [list, setList] = useState<ClassListItemForTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiClient
      .get<{ success: boolean; data: ClassListItemForTest[] }>('/admin/classes/for-tests')
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && Array.isArray(res.data.data)) setList(res.data.data);
        else setList([]);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '반 목록을 불러올 수 없습니다.');
          setList([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function teacherNames(c: ClassListItemForTest): string {
    const t = c.teacherIds;
    if (!Array.isArray(t) || t.length === 0) return '-';
    return t.map((x) => (typeof x === 'object' && x?.name ? x.name : '-')).join(', ');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-title font-bold text-slate-950">시험 관리</h1>
          <p className="text-sm text-slate-500 mt-1">반을 선택한 뒤 해당 반의 시험을 등록·관리합니다.</p>
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
            <div className="overflow-x-auto scrollbar-table">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[13px] font-semibold">
                    <th className="p-4">반 이름</th>
                    <th className="p-4">담당 강사</th>
                    <th className="p-4 whitespace-nowrap">소속 학생 수</th>
                    <th className="p-4 whitespace-nowrap">등록된 시험 수</th>
                    <th className="p-4 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[14px]">
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        등록된 반이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    list.map((row) => (
                      <tr key={row._id} className="hover:bg-slate-50 transition-colors text-slate-700">
                        <td className="p-4 font-medium text-slate-950">{row.name}</td>
                        <td className="p-4">{teacherNames(row)}</td>
                        <td className="p-4">{row.studentCount ?? 0}명</td>
                        <td className="p-4">{row.testCount ?? 0}개</td>
                        <td className="p-4 text-center">
                          <Link
                            to={`/admin/tests/classroom/${row._id}`}
                            className="inline-block px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
                          >
                            시험관리
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
