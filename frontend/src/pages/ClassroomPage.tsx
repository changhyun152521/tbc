import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { ClassDetail, ClassStudentItem } from '../types/class';
import type { LessonDayDetail, LessonDayListItem, AttendanceHomeworkValue, PeriodItem, ReviewVideoItem } from '../types/lesson';
import DateNavigator from '../components/lesson/DateNavigator';
import PeriodSection from '../components/lesson/PeriodSection';
import PeriodListTable, { type PeriodRowItem } from '../components/lesson/PeriodListTable';
import ReviewVideoRegisterModal from '../components/lesson/ReviewVideoRegisterModal';

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmdParam(raw: string | null): string | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function parsePeriodParam(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function lessonDateToYmd(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

function buildPeriodRows(
  periods: PeriodItem[],
  slotCount: number,
  myTeacherId: string | null,
  minSlotCount: number
): PeriodRowItem[] {
  const rows: PeriodRowItem[] = [];
  for (let n = 1; n <= slotCount; n++) {
    const idx = findPeriodIndexByNumber(periods, n);
    if (idx < 0) {
      rows.push({
        periodNumber: n,
        status: 'empty',
        removable: n === slotCount && slotCount > minSlotCount,
      });
      continue;
    }
    const p = periods[idx];
    const isMine = p.isMine === true || (myTeacherId != null && teacherIdOf(p) === myTeacherId);
    rows.push({
      periodNumber: n,
      status: isMine ? 'mine' : 'other',
      teacherName: teacherNameOf(p),
      periodIndex: idx,
    });
  }
  return rows;
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
  const [searchParams] = useSearchParams();
  const { role } = useAuth();
  const isTeacher = role === 'teacher';

  const dateFromUrl = parseYmdParam(searchParams.get('date'));
  const periodFromUrl = parsePeriodParam(searchParams.get('period'));
  const pendingPeriodRef = useRef<number | null>(periodFromUrl);

  const [classInfo, setClassInfo] = useState<ClassDetail | null>(null);
  const [lessonDay, setLessonDay] = useState<LessonDayDetail | null>(null);
  const [date, setDate] = useState(() => dateFromUrl ?? todayString());
  const [loadingClass, setLoadingClass] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [error, setError] = useState('');
  const [addingPeriod, setAddingPeriod] = useState(false);
  const slotBaselineRef = useRef<{ date: string; lessonId: string | null; min: number } | null>(null);
  const [teacherOptions, setTeacherOptions] = useState<{ _id: string; name: string }[]>([]);
  const [registerTeacherId, setRegisterTeacherId] = useState('');

  const [myTeacherId, setMyTeacherId] = useState<string | null>(null);
  const [slotCount, setSlotCount] = useState(0);
  const [selectedPeriodNumber, setSelectedPeriodNumber] = useState<number | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewModalPeriodIndex, setReviewModalPeriodIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [markedDates, setMarkedDates] = useState<string[]>([]);

  useEffect(() => {
    const nextDate = parseYmdParam(searchParams.get('date'));
    const nextPeriod = parsePeriodParam(searchParams.get('period'));
    if (nextPeriod != null) pendingPeriodRef.current = nextPeriod;
    if (nextDate && nextDate !== date) {
      setDate(nextDate);
    } else if (nextPeriod != null && nextDate === date) {
      setSelectedPeriodNumber(nextPeriod);
      pendingPeriodRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply URL deep-link only when searchParams change
  }, [searchParams]);

  const periods = lessonDay?.periods ?? [];

  const classStudents = classInfo?.studentIds?.length
    ? sortStudentsByName(classInfo.studentIds)
    : [];

  const minSlotCount = useMemo(() => minRegisteredSlot(periods), [periods]);

  const periodRows = useMemo(
    () => buildPeriodRows(periods, slotCount, myTeacherId, minSlotCount),
    [periods, slotCount, myTeacherId, minSlotCount]
  );

  const selectedRow = periodRows.find((r) => r.periodNumber === selectedPeriodNumber) ?? null;
  const selectedPeriodIndex = selectedRow?.periodIndex ?? -1;
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

  const fetchMarkedDates = useCallback(async () => {
    if (!classId) return;
    try {
      const res = await apiClient.get<{ success: boolean; data: LessonDayListItem[] }>(
        `/admin/lesson-days?classId=${encodeURIComponent(classId)}`
      );
      if (!res.data.success || !Array.isArray(res.data.data)) {
        setMarkedDates([]);
        return;
      }
      setMarkedDates(
        res.data.data
          .filter((row) => (row.periodCount ?? 0) > 0)
          .map((row) => lessonDateToYmd(String(row.date)))
      );
    } catch {
      setMarkedDates([]);
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
    void fetchMarkedDates();
  }, [fetchMarkedDates, lessonDay?._id, lessonDay?.periods?.length]);

  useEffect(() => {
    setRegisterTeacherId('');
    const pending = pendingPeriodRef.current;
    if (pending != null) {
      setSelectedPeriodNumber(pending);
      pendingPeriodRef.current = null;
    } else {
      setSelectedPeriodNumber(null);
    }
  }, [date, lessonDay?._id]);

  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: { _id: string; name: string }[] }>('/admin/teachers')
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.data)) setTeacherOptions(res.data.data);
      })
      .catch(() => setTeacherOptions([]));
  }, []);

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
    if (loadingLesson) return;
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
  }, [date, lessonDay?._id, periods, loadingLesson]);

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
    const tid = teacherId ?? (isTeacher ? undefined : registerTeacherId);
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
      setRegisterTeacherId('');
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
    records: {
      studentId: string;
      attendance: AttendanceHomeworkValue;
      homework: AttendanceHomeworkValue;
      note?: string;
      parentNote?: string;
      studentReply?: string;
      studentReplyUpdatedAt?: string;
      parentReply?: string;
      parentReplyUpdatedAt?: string;
    }[],
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

  const handleMovePeriod = async (periodIndex: number, fromNumber: number, toNumber: number) => {
    if (!lessonDay?._id || periodIndex < 0) return;
    setReordering(true);
    try {
      await apiClient.patch(`/admin/lesson-days/${lessonDay._id}/periods/move`, {
        periodIndex,
        periodNumber: toNumber,
      });
      setSelectedPeriodNumber((prev) => {
        if (prev === fromNumber) return toNumber;
        if (prev === toNumber) return fromNumber;
        return prev;
      });
      await fetchLessonByDate();
    } catch (err) {
      setError(err instanceof Error ? err.message : '교시 이동에 실패했습니다.');
    } finally {
      setReordering(false);
    }
  };

  const moveTargets = periodRows.filter((r) => r.periodNumber !== selectedPeriodNumber);
  const isOwnSelected =
    selectedPeriod != null &&
    (selectedPeriod.isMine === true || (myTeacherId != null && teacherIdOf(selectedPeriod) === myTeacherId));

  const handleDeletePeriod = async (periodIndex: number) => {
    if (!lessonDay?._id) return;
    if (!window.confirm('이 교시를 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/admin/lesson-days/${lessonDay._id}/periods?periodIndex=${periodIndex}`);
      setSelectedPeriodNumber(null);
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

        <DateNavigator value={date} onChange={setDate} markedDates={markedDates} />

        {loadingLesson ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            수업 정보 로딩 중...
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">교시</p>
              <PeriodListTable
                rows={periodRows}
                selectedPeriodNumber={selectedPeriodNumber}
                onSelect={setSelectedPeriodNumber}
                onRemoveEmptySlot={handleRemoveEmptySlot}
                onExtendSlots={() => setSlotCount((c) => c + 1)}
                onReorder={handleMovePeriod}
                reordering={reordering}
                adding={addingPeriod}
                showRoleBadges={isTeacher}
              />
            </div>
            {selectedPeriodNumber == null ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <p className="text-slate-700 font-medium">표에서 교시를 선택해 주세요</p>
                <p className="text-sm text-slate-500 mt-2">
                  행을 클릭해 수업을 등록하거나 내용을 확인하세요.
                </p>
              </div>
            ) : selectedPeriod && selectedPeriodIndex >= 0 ? (
              <>
                {moveTargets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">교시 변경</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v >= 1 && selectedPeriodIndex >= 0 && selectedPeriodNumber != null) {
                          void handleMovePeriod(selectedPeriodIndex, selectedPeriodNumber, v);
                        }
                        e.target.value = '';
                      }}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    >
                      <option value="" disabled>
                        이동할 교시 선택
                      </option>
                      {moveTargets.map((row) => (
                        <option key={row.periodNumber} value={row.periodNumber}>
                          {row.status === 'empty'
                            ? `${row.periodNumber}교시 (비어있음)`
                            : `${row.periodNumber}교시 (${row.teacherName || '등록됨'} · 맞바꾸기)`}
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
                  readOnly={false}
                  canDelete
                  canEditReviewVideos={!isTeacher || (isOwnSelected && selectedPeriod.canEditReviewVideos !== false)}
                  useReviewVideoModal={isTeacher}
                  lockTeacherSelect={isTeacher}
                  onOpenReviewVideos={() => {
                    setReviewModalPeriodIndex(selectedPeriodIndex);
                    setReviewModalOpen(true);
                  }}
                  onSave={handleSavePeriod}
                  onDelete={handleDeletePeriod}
                />
              </>
            ) : selectedRow?.status === 'empty' ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-slate-800 font-semibold">{selectedPeriodNumber}교시 · 비어있음</p>
                <p className="text-sm text-slate-500 mt-2">
                  {isTeacher ? '이 교시에 내 수업을 등록할 수 있습니다.' : '담당 강사를 선택해 교시를 등록하세요.'}
                </p>
                {isTeacher ? (
                  <button
                    type="button"
                    disabled={addingPeriod}
                    onClick={() => void handleTeacherRegisterAt(selectedPeriodNumber)}
                    className="mt-5 px-6 py-2.5 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                  >
                    {addingPeriod ? '등록 중...' : '내 교시 등록'}
                  </button>
                ) : (
                  <div className="mt-5 max-w-xs mx-auto space-y-3">
                    <select
                      value={registerTeacherId}
                      onChange={(e) => setRegisterTeacherId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900"
                    >
                      <option value="">강사 선택</option>
                      {teacherOptions.map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={addingPeriod || !registerTeacherId}
                      onClick={() => void ensureLessonDayThenAddPeriod(selectedPeriodNumber)}
                      className="w-full px-6 py-2.5 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                    >
                      {addingPeriod ? '등록 중...' : '교시 등록'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

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
