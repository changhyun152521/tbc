import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { ClassDetail, ClassStudentItem } from '../types/class';
import type { LessonDayDetail, AttendanceHomeworkValue, PeriodItem, ReviewVideoItem } from '../types/lesson';
import DateNavigator from '../components/lesson/DateNavigator';
import PeriodSection from '../components/lesson/PeriodSection';
import PeriodChipBar, { type PeriodChipItem } from '../components/lesson/PeriodChipBar';
import ReviewVideoRegisterModal from '../components/lesson/ReviewVideoRegisterModal';

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function sortStudentsByName(students: ClassStudentItem[]): ClassStudentItem[] {
  return [...students].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
}

function teacherIdOf(p: PeriodItem): string {
  const t = p.teacherId;
  return typeof t === 'object' && t?._id ? t._id : String(t);
}

function teacherNameOf(p: PeriodItem): string {
  const t = p.teacherId;
  return typeof t === 'object' && t?.name ? t.name : '';
}

function periodNum(p: PeriodItem, fallback: number): number {
  return p.periodNumber ?? fallback;
}

function findPeriodIndexByNumber(periods: PeriodItem[], n: number): number {
  return periods.findIndex((p, i) => periodNum(p, i + 1) === n);
}

function buildChipItems(
  periods: PeriodItem[],
  slotCount: number,
  myTeacherId: string | null,
  minSlotCount: number
): PeriodChipItem[] {
  const chips: PeriodChipItem[] = [];
  for (let n = 1; n <= slotCount; n++) {
    const idx = findPeriodIndexByNumber(periods, n);
    if (idx < 0) {
      chips.push({
        periodNumber: n,
        status: 'empty',
        removable: n === slotCount && slotCount > minSlotCount,
      });
      continue;
    }
    const p = periods[idx];
    const isMine = p.isMine === true || (myTeacherId != null && teacherIdOf(p) === myTeacherId);
    chips.push({
      periodNumber: n,
      status: isMine ? 'mine' : 'other',
      teacherName: teacherNameOf(p),
      periodIndex: idx,
    });
  }
  return chips;
}

function minRegisteredSlot(periods: PeriodItem[]): number {
  if (periods.length === 0) return 0;
  return Math.max(...periods.map((p, i) => periodNum(p, i + 1)));
}

function buildInitialVideos(p: PeriodItem): ReviewVideoItem[] {
  const vids = p.reviewVideos ?? [];
  if (vids.length > 0) return vids.map((v, i) => ({ ...v, order: v.order ?? i }));
  const legacy = (p.reviewVideoUrl ?? '').trim();
  if (legacy) return [{ url: legacy, videoId: p.reviewVideoId ?? '', title: '', order: 0 }];
  return [];
}

export default function ClassroomPage() {
  const { classId } = useParams<{ classId: string }>();
  const { role } = useAuth();
  const isTeacher = role === 'teacher';

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
  const slotBaselineRef = useRef<{ date: string; lessonId: string | null; min: number } | null>(null);
  const [teacherOptions, setTeacherOptions] = useState<{ _id: string; name: string }[]>([]);

  const [myTeacherId, setMyTeacherId] = useState<string | null>(null);
  const [slotCount, setSlotCount] = useState(0);
  const [selectedPeriodNumber, setSelectedPeriodNumber] = useState<number | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewModalPeriodIndex, setReviewModalPeriodIndex] = useState<number | null>(null);

  const hasAnyChanges = Object.values(periodHasChanges).some(Boolean);
  const periods = lessonDay?.periods ?? [];

  const classStudents = classInfo?.studentIds?.length
    ? sortStudentsByName(classInfo.studentIds)
    : [];

  const minSlotCount = useMemo(() => minRegisteredSlot(periods), [periods]);

  const chips = useMemo(
    () => buildChipItems(periods, slotCount, myTeacherId, minSlotCount),
    [periods, slotCount, myTeacherId, minSlotCount]
  );

  const selectedChip = chips.find((c) => c.periodNumber === selectedPeriodNumber) ?? null;
  const selectedPeriodIndex = selectedChip?.periodIndex ?? -1;
  const selectedPeriod = selectedPeriodIndex >= 0 ? periods[selectedPeriodIndex] : null;

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
    if (isTeacher) setSelectedPeriodNumber(null);
  }, [date, lessonDay?._id, isTeacher]);

  useEffect(() => {
    if (!isTeacher) {
      apiClient
        .get<{ success: boolean; data: { _id: string; name: string }[] }>('/admin/teachers')
        .then((res) => {
          if (res.data.success && Array.isArray(res.data.data)) setTeacherOptions(res.data.data);
        })
        .catch(() => setTeacherOptions([]));
    }
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;
    apiClient
      .get<{ success: boolean; data?: { teacherId?: string } }>('/me')
      .then((res) => {
        if (res.data.success && res.data.data?.teacherId) setMyTeacherId(res.data.data.teacherId);
      })
      .catch(() => setMyTeacherId(null));
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher || loadingLesson) return;
    const lessonId = lessonDay?._id ?? null;
    const min = minRegisteredSlot(periods);
    const baseline = slotBaselineRef.current;

    if (!baseline || baseline.date !== date || baseline.lessonId !== lessonId) {
      slotBaselineRef.current = { date, lessonId, min };
      setSlotCount(min);
      return;
    }

    if (min > baseline.min) {
      slotBaselineRef.current = { ...baseline, min };
      setSlotCount((prev) => Math.max(prev, min));
    } else if (min < baseline.min) {
      slotBaselineRef.current = { ...baseline, min };
      setSlotCount(min);
    }
  }, [isTeacher, date, lessonDay?._id, periods, loadingLesson]);

  const ensureLessonDay = async (): Promise<string | null> => {
    if (!classId) return null;
    let lessonId = lessonDay?._id;
    if (!lessonId) {
      const createRes = await apiClient.post<{ success: boolean; data: { _id: string } }>(
        '/admin/lesson-days',
        { classId, date }
      );
      if (!createRes.data.success || !createRes.data.data?._id) {
        setError('수업일 생성에 실패했습니다.');
        return null;
      }
      lessonId = createRes.data.data._id;
    }
    return lessonId;
  };

  const ensureLessonDayThenAddPeriod = async (periodNumber?: number, teacherId?: string) => {
    const tid = teacherId ?? addPeriodTeacherId;
    if (!isTeacher && !tid) return;
    if (isTeacher && periodNumber == null) return;
    setAddingPeriod(true);
    setError('');
    try {
      const lessonId = await ensureLessonDay();
      if (!lessonId) return;
      await apiClient.post(`/admin/lesson-days/${lessonId}/periods`, {
        ...(isTeacher ? { periodNumber } : { teacherId: tid, periodNumber }),
      });
      setAddPeriodOpen(false);
      setAddPeriodTeacherId('');
      await fetchLessonByDate();
      if (periodNumber != null) setSelectedPeriodNumber(periodNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : '교시 추가에 실패했습니다.');
    } finally {
      setAddingPeriod(false);
    }
  };

  const handleTeacherRegisterAt = async (periodNumber: number) => {
    if (!window.confirm(`${periodNumber}교시에 내 교시를 등록하시겠습니까?`)) return;
    await ensureLessonDayThenAddPeriod(periodNumber);
  };

  const handleRemoveEmptySlot = (periodNumber: number) => {
    if (periodNumber !== slotCount || slotCount <= minSlotCount) return;
    setSlotCount((c) => c - 1);
    if (selectedPeriodNumber === periodNumber) setSelectedPeriodNumber(null);
  };

  const handleSavePeriod = async (
    periodIndex: number,
    teacherId: string,
    records: { studentId: string; attendance: AttendanceHomeworkValue; homework: AttendanceHomeworkValue; note?: string; parentNote?: string }[],
    options?: { memo?: string; homeworkDescription?: string; homeworkDueDate?: string | null; reviewVideoUrl?: string; reviewVideos?: ReviewVideoItem[] }
  ) => {
    if (!lessonDay?._id) return;
    try {
      const body: Record<string, unknown> = {
        periodIndex,
        teacherId: isTeacher ? undefined : teacherId,
        memo: options?.memo ?? '',
        homeworkDescription: options?.homeworkDescription ?? '',
        homeworkDueDate: options?.homeworkDueDate ?? undefined,
        records,
      };
      if (!isTeacher) {
        body.reviewVideos = options?.reviewVideos ?? [];
      }
      await apiClient.put(`/admin/lesson-days/${lessonDay._id}/periods`, body);
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

  const handleSaveReviewVideos = async (videos: ReviewVideoItem[]) => {
    if (!lessonDay?._id || reviewModalPeriodIndex == null) return;
    await apiClient.put(`/admin/lesson-days/${lessonDay._id}/periods/review-videos`, {
      periodIndex: reviewModalPeriodIndex,
      reviewVideos: videos,
    });
    await fetchLessonByDate();
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

  const handleMovePeriod = async (newPeriodNumber: number) => {
    if (!lessonDay?._id || selectedPeriodIndex < 0) return;
    try {
      await apiClient.patch(`/admin/lesson-days/${lessonDay._id}/periods/move`, {
        periodIndex: selectedPeriodIndex,
        periodNumber: newPeriodNumber,
      });
      setSelectedPeriodNumber(newPeriodNumber);
      await fetchLessonByDate();
    } catch (err) {
      setError(err instanceof Error ? err.message : '교시 이동에 실패했습니다.');
    }
  };

  const emptySlotNumbers = chips.filter((c) => c.status === 'empty').map((c) => c.periodNumber);
  const isOwnSelected =
    selectedPeriod != null &&
    (selectedPeriod.isMine === true || (myTeacherId != null && teacherIdOf(selectedPeriod) === myTeacherId));

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
          {!isTeacher && (
            <>
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
            </>
          )}
        </div>

        {loadingLesson ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            수업 정보 로딩 중...
          </div>
        ) : isTeacher ? (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">교시</p>
              <PeriodChipBar
                chips={chips}
                selectedPeriodNumber={selectedPeriodNumber}
                onSelect={setSelectedPeriodNumber}
                onRemoveEmptySlot={handleRemoveEmptySlot}
                onExtendSlots={() => setSlotCount((c) => c + 1)}
                adding={addingPeriod}
              />
            </div>
            {selectedPeriodNumber == null ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <p className="text-slate-700 font-medium">교시를 선택해 주세요</p>
                <p className="text-sm text-slate-500 mt-2">
                  목록에서 교시를 선택해 수업을 등록하거나 내용을 확인하세요.
                  <br />
                  내 교시(파랑) · 다른 강사(진한 회색) · 비어있음(흰색)으로 구분됩니다.
                </p>
              </div>
            ) : selectedPeriod && selectedPeriodIndex >= 0 ? (
              <>
                {isOwnSelected && emptySlotNumbers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">교시 변경</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v >= 1) void handleMovePeriod(v);
                        e.target.value = '';
                      }}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    >
                      <option value="" disabled>
                        이동할 교시 선택
                      </option>
                      {emptySlotNumbers.map((n) => (
                        <option key={n} value={n}>
                          {n}교시 (비어있음)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <PeriodSection
                key={`${lessonDay?._id ?? 'new'}-${selectedPeriodIndex}`}
                periodIndex={selectedPeriodIndex}
                period={selectedPeriod}
                teacherOptions={teacherOptions}
                classStudents={classStudents}
                readOnly={!(selectedPeriod.isMine === true || (myTeacherId != null && teacherIdOf(selectedPeriod) === myTeacherId))}
                canEditReviewVideos={
                  (selectedPeriod.isMine === true || (myTeacherId != null && teacherIdOf(selectedPeriod) === myTeacherId)) &&
                  selectedPeriod.canEditReviewVideos !== false
                }
                useReviewVideoModal
                lockTeacherSelect
                onOpenReviewVideos={() => {
                  setReviewModalPeriodIndex(selectedPeriodIndex);
                  setReviewModalOpen(true);
                }}
                onSave={handleSavePeriod}
                onDelete={handleDeletePeriod}
              />
              </>
            ) : selectedChip?.status === 'empty' ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-slate-800 font-semibold">{selectedPeriodNumber}교시 · 비어있음</p>
                <p className="text-sm text-slate-500 mt-2">이 교시에 내 수업을 등록할 수 있습니다.</p>
                <button
                  type="button"
                  disabled={addingPeriod}
                  onClick={() => void handleTeacherRegisterAt(selectedPeriodNumber)}
                  className="mt-5 px-6 py-2.5 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {addingPeriod ? '등록 중...' : '내 교시 등록'}
                </button>
              </div>
            ) : null}
          </>
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

      {!isTeacher && addPeriodOpen && (
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
                onClick={() => ensureLessonDayThenAddPeriod()}
                disabled={!addPeriodTeacherId || addingPeriod}
                className="flex-1 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:hover:bg-white"
              >
                {addingPeriod ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isTeacher && reviewModalOpen && reviewModalPeriodIndex != null && selectedPeriod && (
        <ReviewVideoRegisterModal
          open={reviewModalOpen}
          initialVideos={buildInitialVideos(selectedPeriod)}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewModalPeriodIndex(null);
          }}
          onSave={handleSaveReviewVideos}
        />
      )}
    </div>
  );
}
