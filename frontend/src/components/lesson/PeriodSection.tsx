import { useState, useEffect, useMemo } from 'react';
import AttendanceHomeworkTable from './AttendanceHomeworkTable';
import type { PeriodItem, StudentRecord, AttendanceHomeworkValue } from '../../types/lesson';
import type { ClassStudentItem } from '../../types/class';

interface PeriodSectionProps {
  periodIndex: number;
  period: PeriodItem;
  teacherOptions: { _id: string; name: string }[];
  /** 반 소속 학생 전체 (가나다순). 없으면 period.records만 사용 (기존 상세 페이지 호환) */
  classStudents?: ClassStudentItem[];
  onSave: (
    periodIndex: number,
    teacherId: string,
    records: { studentId: string; attendance: AttendanceHomeworkValue; homework: AttendanceHomeworkValue; note?: string }[],
    options?: { memo?: string; homeworkDescription?: string; homeworkDueDate?: string | null }
  ) => void;
  onDelete: (periodIndex: number) => void;
  /** 상단 일괄 저장 시 트리거. 변경되면 이 교시에 변경이 있으면 저장 수행 (지정 시 교시별 저장 버튼 숨김) */
  saveAllTrigger?: number;
  /** 일괄 저장 시작 시 호출 (저장할 교시 수 카운트용) */
  onWillSave?: (periodIndex: number) => void;
  /** 변경 여부 변경 시 호출 (상단 저장 버튼 활성/비활성용) */
  onHasChangesChange?: (periodIndex: number, hasChanges: boolean) => void;
  /** 교시별 저장 버튼 사용 시 로딩 상태 (LessonDetail 등) */
  saving?: boolean;
}

function teacherId(p: PeriodItem): string {
  const t = p.teacherId;
  return typeof t === 'object' && t?._id ? (t as { _id: string })._id : String(t);
}

/** period.records를 반 학생 순서(classStudents)에 맞춰 병합. 없으면 periodRecords 그대로 반환 */
function mergeRecords(
  classStudents: ClassStudentItem[] | undefined,
  periodRecords: StudentRecord[]
): StudentRecord[] {
  if (!classStudents?.length) return periodRecords;
  const byId: Record<string, StudentRecord> = {};
  for (const r of periodRecords) {
    const sid = typeof r.studentId === 'object' && r.studentId?._id ? r.studentId._id : String(r.studentId);
    byId[sid] = r;
  }
  return classStudents.map((s) => {
    const existing = byId[s._id];
    return existing
      ? { ...existing, studentId: s }
      : { studentId: s, attendance: '' as const, homework: '' as const, note: '' };
  });
}

function recordStudentId(r: StudentRecord): string {
  const s = r.studentId;
  return typeof s === 'object' && s?._id ? s._id : String(s);
}

/** 현재 records가 서버 기준(initial)과 동일한지 */
function recordsEqual(current: StudentRecord[], initial: StudentRecord[]): boolean {
  if (current.length !== initial.length) return false;
  for (let i = 0; i < current.length; i++) {
    if (recordStudentId(current[i]) !== recordStudentId(initial[i])) return false;
    if ((current[i].attendance || '') !== (initial[i].attendance || '')) return false;
    if ((current[i].homework || '') !== (initial[i].homework || '')) return false;
    if ((current[i].note ?? '') !== (initial[i].note ?? '')) return false;
  }
  return true;
}

export default function PeriodSection({
  periodIndex,
  period,
  teacherOptions,
  classStudents,
  onSave,
  onDelete,
  saveAllTrigger,
  onWillSave,
  onHasChangesChange,
  saving = false,
}: PeriodSectionProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(teacherId(period));
  const merged = useMemo(
    () => mergeRecords(classStudents, period.records ?? []),
    [classStudents, period.records]
  );
  const [records, setRecords] = useState<StudentRecord[]>(merged);
  const hasClassStudents = Boolean(classStudents?.length);

  const memoInitial = period.memo ?? '';
  const homeworkDescInitial = period.homeworkDescription ?? '';
  const dueDateInitial = period.homeworkDueDate
    ? (typeof period.homeworkDueDate === 'string'
        ? period.homeworkDueDate.slice(0, 10)
        : new Date(period.homeworkDueDate).toISOString().slice(0, 10))
    : '';
  const [memo, setMemo] = useState(memoInitial);
  const [homeworkDescription, setHomeworkDescription] = useState(homeworkDescInitial);
  const [homeworkDueDate, setHomeworkDueDate] = useState(dueDateInitial);

  useEffect(() => {
    setSelectedTeacherId(teacherId(period));
    setRecords(mergeRecords(classStudents, period.records ?? []));
    setMemo(period.memo ?? '');
    setHomeworkDescription(period.homeworkDescription ?? '');
    setHomeworkDueDate(
      period.homeworkDueDate
        ? (typeof period.homeworkDueDate === 'string'
            ? period.homeworkDueDate.slice(0, 10)
            : new Date(period.homeworkDueDate).toISOString().slice(0, 10))
        : ''
    );
  }, [period]); // classStudents 제외: 부모 리렌더 시 새 배열 참조로 인해 초기화되면 사용자가 누른 O/X·COMMENT가 덮어씌워지는 문제 방지

  useEffect(() => {
    if (saveAllTrigger == null || saveAllTrigger <= 0) return;
    const isChanged =
      selectedTeacherId !== teacherId(period) ||
      memo !== (period.memo ?? '') ||
      homeworkDescription !== (period.homeworkDescription ?? '') ||
      homeworkDueDate !== periodDueStr ||
      !recordsEqual(records, merged);
    if (!isChanged) return;
    onWillSave?.(periodIndex);
    handleSave();
  }, [saveAllTrigger]);

  const handleAttendanceChange = (studentId: string, value: AttendanceHomeworkValue) => {
    setRecords((prev) =>
      prev.map((r) => {
        const sid = typeof r.studentId === 'object' && r.studentId?._id ? r.studentId._id : String(r.studentId);
        return sid === studentId ? { ...r, attendance: value } : r;
      })
    );
  };

  const handleHomeworkChange = (studentId: string, value: AttendanceHomeworkValue) => {
    setRecords((prev) =>
      prev.map((r) => {
        const sid = typeof r.studentId === 'object' && r.studentId?._id ? r.studentId._id : String(r.studentId);
        return sid === studentId ? { ...r, homework: value } : r;
      })
    );
  };

  const handleNoteChange = (studentId: string, value: string) => {
    setRecords((prev) =>
      prev.map((r) => {
        const sid = typeof r.studentId === 'object' && r.studentId?._id ? r.studentId._id : String(r.studentId);
        return sid === studentId ? { ...r, note: value } : r;
      })
    );
  };

  const handleSave = () => {
    const payload = records.map((r) => {
      const sid = typeof r.studentId === 'object' && r.studentId?._id ? r.studentId._id : String(r.studentId);
      return {
        studentId: sid,
        attendance: r.attendance,
        homework: r.homework,
        note: r.note ?? '',
      };
    });
    onSave(periodIndex, selectedTeacherId, payload, {
      memo: memo.trim() || undefined,
      homeworkDescription: homeworkDescription.trim() || undefined,
      homeworkDueDate: homeworkDueDate.trim() || null,
    });
  };

  const handleBulkAttendance = (value: AttendanceHomeworkValue) => {
    setRecords((prev) => prev.map((r) => ({ ...r, attendance: value })));
  };

  const handleBulkHomework = (value: AttendanceHomeworkValue) => {
    setRecords((prev) => prev.map((r) => ({ ...r, homework: value })));
  };

  const periodDueStr = period.homeworkDueDate
    ? (typeof period.homeworkDueDate === 'string' ? period.homeworkDueDate.slice(0, 10) : new Date(period.homeworkDueDate).toISOString().slice(0, 10))
    : '';
  const hasChanges =
    selectedTeacherId !== teacherId(period) ||
    memo !== (period.memo ?? '') ||
    homeworkDescription !== (period.homeworkDescription ?? '') ||
    homeworkDueDate !== periodDueStr ||
    !recordsEqual(records, merged);

  useEffect(() => {
    onHasChangesChange?.(periodIndex, hasChanges);
  }, [periodIndex, hasChanges, onHasChangesChange]);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-wrap items-center gap-2 sm:gap-3">
        <h3 className="text-slate-600 text-sm sm:text-base font-bold shrink-0">
          {periodIndex + 1}교시
        </h3>
        <select
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none shrink-0"
        >
          {teacherOptions.map((t) => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
        </select>
        {saveAllTrigger == null && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-5 py-2.5 sm:py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 shrink-0 min-w-[72px]"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(periodIndex)}
          className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 shrink-0"
        >
          교시 삭제
        </button>
      </div>
      <div className="p-3 lg:py-6 lg:px-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-600 text-sm font-semibold mb-1.5">진도 (수업 내용)</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="오늘 진도 내용을 자유롭게 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none resize-y"
            />
          </div>
          <div>
            <label className="block text-slate-600 text-sm font-semibold mb-1.5">과제</label>
            <textarea
              value={homeworkDescription}
              onChange={(e) => setHomeworkDescription(e.target.value)}
              placeholder="과제 내용을 자유롭게 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none resize-y"
            />
            <div className="mt-2">
              <label className="block text-slate-500 text-xs font-medium mb-1">과제 마감기한</label>
              <input
                type="date"
                value={homeworkDueDate}
                onChange={(e) => setHomeworkDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-nowrap items-center justify-end gap-2 mb-3 lg:mb-2">
          <button
            type="button"
            onClick={() => handleBulkAttendance('O')}
            className="shrink-0 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            출석O
          </button>
          <button
            type="button"
            onClick={() => handleBulkAttendance('X')}
            className="shrink-0 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            출석X
          </button>
          <button
            type="button"
            onClick={() => handleBulkHomework('O')}
            className="shrink-0 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            과제O
          </button>
          <button
            type="button"
            onClick={() => handleBulkHomework('X')}
            className="shrink-0 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            과제X
          </button>
        </div>
        <AttendanceHomeworkTable
          records={records}
          onAttendanceChange={handleAttendanceChange}
          onHomeworkChange={handleHomeworkChange}
          onNoteChange={hasClassStudents ? handleNoteChange : undefined}
        />
      </div>
    </section>
  );
}
