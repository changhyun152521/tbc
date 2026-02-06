import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { LessonDayDetail, AttendanceHomeworkValue } from '../types/lesson';
import PeriodSection from '../components/lesson/PeriodSection';

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<LessonDayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teacherOptions, setTeacherOptions] = useState<{ _id: string; name: string }[]>([]);
  const [addPeriodOpen, setAddPeriodOpen] = useState(false);
  const [addPeriodTeacherId, setAddPeriodTeacherId] = useState('');
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [savingPeriodIndex, setSavingPeriodIndex] = useState<number | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ success: boolean; data: LessonDayDetail }>(`/admin/lesson-days/${id}`);
      if (!res.data.success || !res.data.data) throw new Error('수업 정보를 불러올 수 없습니다.');
      setDetail(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수업 정보를 불러올 수 없습니다.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: { _id: string; name: string }[] }>('/admin/teachers');
        if (res.data.success && Array.isArray(res.data.data)) setTeacherOptions(res.data.data);
      } catch {
        setTeacherOptions([]);
      }
    })();
  }, []);

  const handleAddPeriod = async () => {
    if (!id || !addPeriodTeacherId) return;
    setAddingPeriod(true);
    try {
      await apiClient.post(`/admin/lesson-days/${id}/periods`, { teacherId: addPeriodTeacherId });
      setAddPeriodOpen(false);
      setAddPeriodTeacherId('');
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : '교시 추가에 실패했습니다.');
    } finally {
      setAddingPeriod(false);
    }
  };

  const handleSavePeriod = async (
    periodIndex: number,
    teacherId: string,
    records: { studentId: string; attendance: AttendanceHomeworkValue; homework: AttendanceHomeworkValue; note?: string }[],
    options?: { memo?: string; homeworkDescription?: string; homeworkDueDate?: string | null }
  ) => {
    if (!id) return;
    setSavingPeriodIndex(periodIndex);
    try {
      await apiClient.put(`/admin/lesson-days/${id}/periods`, {
        periodIndex,
        teacherId,
        memo: options?.memo ?? '',
        homeworkDescription: options?.homeworkDescription ?? '',
        homeworkDueDate: options?.homeworkDueDate ?? undefined,
        records,
      });
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSavingPeriodIndex(null);
    }
  };

  const handleDeletePeriod = async (periodIndex: number) => {
    if (!id) return;
    if (!window.confirm('이 교시를 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/admin/lesson-days/${id}/periods?periodIndex=${periodIndex}`);
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : '교시 삭제에 실패했습니다.');
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="w-full max-w-6xl mx-auto">
          <p className="text-slate-600">수업 ID가 없습니다.</p>
          <Link to="/admin/lessons" className="text-slate-900 font-medium mt-2 inline-block">목록으로</Link>
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
          <Link to="/admin/lessons" className="text-slate-900 font-medium mt-2 inline-block">목록으로</Link>
        </div>
      </div>
    );
  }

  const className = detail?.classId?.name ?? '-';
  const dateStr = detail?.date
    ? (typeof detail.date === 'string' ? detail.date.slice(0, 10) : new Date(detail.date).toISOString().slice(0, 10))
    : '-';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-6 pb-12">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
        <div>
          <Link to="/admin/lessons" className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
            ← 수업 목록
          </Link>
          <h1 className="text-[22px] sm:text-[32px] font-title font-bold text-slate-950">
            {className} · {dateStr}
          </h1>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-slate-600 text-sm sm:text-base font-bold uppercase tracking-wide">
            교시 관리
          </h2>
          <button
            type="button"
            onClick={() => setAddPeriodOpen(true)}
            className="px-4 py-2.5 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
          >
            교시 추가
          </button>
        </div>

        <div className="space-y-8">
          {detail?.periods?.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
              등록된 교시가 없습니다. 교시 추가 버튼으로 추가하세요.
            </div>
          ) : (
            detail?.periods?.map((period, idx) => (
              <PeriodSection
                key={idx}
                periodIndex={idx}
                period={period}
                teacherOptions={teacherOptions}
                onSave={handleSavePeriod}
                onDelete={handleDeletePeriod}
                saving={savingPeriodIndex === idx}
              />
            ))
          )}
        </div>
      </div>

      {addPeriodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={() => setAddPeriodOpen(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-950 mb-4">교시 추가</h3>
            <p className="text-sm text-slate-500 mb-3">담당 강사를 선택하세요.</p>
            <select
              value={addPeriodTeacherId}
              onChange={(e) => setAddPeriodTeacherId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 mb-4"
            >
              <option value="">강사 선택</option>
              {teacherOptions.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAddPeriodOpen(false); setAddPeriodTeacherId(''); }}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddPeriod}
                disabled={!addPeriodTeacherId || addingPeriod}
                className="flex-1 py-2 bg-slate-950 text-white rounded-lg disabled:opacity-50"
              >
                {addingPeriod ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
