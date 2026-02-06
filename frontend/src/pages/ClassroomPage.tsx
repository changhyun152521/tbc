import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ClassDetail, ClassStudentItem } from '../types/class';
import type { LessonDayDetail, AttendanceHomeworkValue } from '../types/lesson';
import DateNavigator from '../components/lesson/DateNavigator';
import PeriodSection from '../components/lesson/PeriodSection';

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** 반 소속 학생을 이름 가나다순 정렬 */
function sortStudentsByName(students: ClassStudentItem[]): ClassStudentItem[] {
  return [...students].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
}

export default function ClassroomPage() {
  const { classId } = useParams<{ classId: string }>();
  const [classInfo, setClassInfo] = useState<ClassDetail | null>(null);
  const [lessonDay, setLessonDay] = useState<LessonDayDetail | null>(null);
  const [date, setDate] = useState(todayString);
  const [loadingClass, setLoadingClass] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [error, setError] = useState('');
  const [addPeriodOpen, setAddPeriodOpen] = useState(false);
  const [addPeriodTeacherId, setAddPeriodTeacherId] = useState('');
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [saveAllTrigger, setSaveAllTrigger] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const [periodHasChanges, setPeriodHasChanges] = useState<Record<number, boolean>>({});
  const pendingSaveCountRef = useRef(0);
  const [teacherOptions, setTeacherOptions] = useState<{ _id: string; name: string }[]>([]);

  const hasAnyChanges = Object.values(periodHasChanges).some(Boolean);

  const classStudents = classInfo?.studentIds?.length
    ? sortStudentsByName(classInfo.studentIds)
    : [];

  const fetchClass = useCallback(async () => {
    if (!classId) return;
    setLoadingClass(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: ClassDetail }>(`/admin/classes/${classId}`);
      if (res.data.success && res.data.data) setClassInfo(res.data.data);
      else setClassInfo(null);
    } catch {
      setClassInfo(null);
      setError('반 정보를 불러올 수 없습니다.');
    } finally {
      setLoadingClass(false);
    }
  }, [classId]);

  const fetchLessonByDate = useCallback(async () => {
    if (!classId || !date) return;
    setLoadingLesson(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: LessonDayDetail | null }>(
        `/admin/lesson-days/by-class-date?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`
      );
      if (res.data.success) setLessonDay(res.data.data ?? null);
      else setLessonDay(null);
    } catch {
      setLessonDay(null);
    } finally {
      setLoadingLesson(false);
    }
  }, [classId, date]);

  useEffect(() => {
    fetchClass();
  }, [fetchClass]);

  useEffect(() => {
    fetchLessonByDate();
  }, [fetchLessonByDate]);

  useEffect(() => {
    setPeriodHasChanges({});
  }, [date, lessonDay?._id]);

  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: { _id: string; name: string }[] }>('/admin/teachers')
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.data)) setTeacherOptions(res.data.data);
      })
      .catch(() => setTeacherOptions([]));
  }, []);

  const ensureLessonDayThenAddPeriod = async () => {
    if (!classId || !addPeriodTeacherId) return;
    setAddingPeriod(true);
    setError('');
    try {
      let lessonId = lessonDay?._id;
      if (!lessonId) {
        const createRes = await apiClient.post<{ success: boolean; data: { _id: string } }>(
          '/admin/lesson-days',
          { classId, date }
        );
        if (!createRes.data.success || !createRes.data.data?._id) {
          setError('수업일 생성에 실패했습니다.');
          return;
        }
        lessonId = createRes.data.data._id;
      }
      await apiClient.post(`/admin/lesson-days/${lessonId}/periods`, {
        teacherId: addPeriodTeacherId,
      });
      setAddPeriodOpen(false);
      setAddPeriodTeacherId('');
      await fetchLessonByDate();
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
    if (!lessonDay?._id) return;
    try {
      await apiClient.put(`/admin/lesson-days/${lessonDay._id}/periods`, {
        periodIndex,
        teacherId,
        memo: options?.memo ?? '',
        homeworkDescription: options?.homeworkDescription ?? '',
        homeworkDueDate: options?.homeworkDueDate ?? undefined,
        records,
      });
      await fetchLessonByDate();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      pendingSaveCountRef.current--;
      if (pendingSaveCountRef.current <= 0) {
        pendingSaveCountRef.current = 0;
        setSavingAll(false);
      }
    }
  };

  const handleWillSavePeriod = useCallback((_periodIndex: number) => {
    pendingSaveCountRef.current++;
  }, []);

  const handleHasChangesChange = useCallback((periodIndex: number, hasChanges: boolean) => {
    setPeriodHasChanges((prev) =>
      prev[periodIndex] === hasChanges ? prev : { ...prev, [periodIndex]: hasChanges }
    );
  }, []);

  const handleSaveAll = useCallback(() => {
    if (!lessonDay?.periods?.length) return;
    setError('');
    setSavingAll(true);
    setSaveAllTrigger((t) => t + 1);
    setTimeout(() => {
      if (pendingSaveCountRef.current === 0) setSavingAll(false);
    }, 150);
  }, [lessonDay?.periods?.length]);

  const handleDeletePeriod = async (periodIndex: number) => {
    if (!lessonDay?._id) return;
    if (!window.confirm('이 교시를 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/admin/lesson-days/${lessonDay._id}/periods?periodIndex=${periodIndex}`);
      await fetchLessonByDate();
    } catch (err) {
      setError(err instanceof Error ? err.message : '교시 삭제에 실패했습니다.');
    }
  };

  if (!classId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="w-full max-w-6xl mx-auto">
          <p className="text-slate-600">반 정보가 없습니다.</p>
          <Link to="/admin/lessons" className="text-slate-900 font-medium mt-2 inline-block">수업 관리로</Link>
        </div>
      </div>
    );
  }

  if (loadingClass) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="w-full max-w-6xl mx-auto">
          <div className="p-12 text-center text-slate-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="w-full max-w-6xl mx-auto">
          <p className="text-red-600">{error || '반을 찾을 수 없습니다.'}</p>
          <Link to="/admin/lessons" className="text-slate-900 font-medium mt-2 inline-block">수업 관리로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-8 pb-12">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 space-y-6 sm:space-y-8">
        <div>
          <Link
            to="/admin/lessons"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1.5 inline-block"
          >
            ← 수업 관리
          </Link>
          <h1 className="text-[22px] sm:text-[32px] font-title font-extrabold text-slate-950">
            {classInfo.name}
          </h1>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <DateNavigator value={date} onChange={setDate} />
          <button
            type="button"
            onClick={() => setAddPeriodOpen(true)}
            className="h-[42px] px-4 py-2.5 box-border bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-slate-400 flex items-center"
          >
            교시 추가
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!lessonDay?.periods?.length || savingAll || !hasAnyChanges}
            className="h-[42px] px-4 py-2.5 box-border bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 flex items-center"
          >
            {savingAll ? '저장 중...' : '저장'}
          </button>
        </div>

        {loadingLesson ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            수업 정보 로딩 중...
          </div>
        ) : !lessonDay ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
            이 날짜에는 아직 수업이 없습니다. 교시 추가 버튼으로 수업을 시작하세요.
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {lessonDay.periods?.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                등록된 교시가 없습니다. 교시 추가 버튼으로 추가하세요.
              </div>
            ) : (
              lessonDay.periods?.map((period, idx) => (
                <PeriodSection
                  key={idx}
                  periodIndex={idx}
                  period={period}
                  teacherOptions={teacherOptions}
                  classStudents={classStudents}
                  onSave={handleSavePeriod}
                  onDelete={handleDeletePeriod}
                  saveAllTrigger={saveAllTrigger}
                  onWillSave={handleWillSavePeriod}
                  onHasChangesChange={handleHasChangesChange}
                />
              ))
            )}
          </div>
        )}
      </div>

      {addPeriodOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setAddPeriodOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
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
                onClick={ensureLessonDayThenAddPeriod}
                disabled={!addPeriodTeacherId || addingPeriod}
                className="flex-1 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:hover:bg-white"
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
