import { useState, useEffect, FormEvent } from 'react';
import type { StudentFormValues } from '../../types/student';

interface StudentFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: StudentFormValues | null;
  onClose: () => void;
  onSubmit: (values: StudentFormValues) => Promise<void>;
}

const emptyForm: StudentFormValues = {
  name: '',
  school: '',
  grade: '',
  studentPhone: '',
  parentPhone: '',
  studentLoginId: '',
  studentPassword: '',
  parentLoginId: '',
  parentPassword: '',
};

export default function StudentFormModal({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: StudentFormModalProps) {
  const [form, setForm] = useState<StudentFormValues>(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialValues ?? emptyForm);
      setError('');
    }
  }, [open, initialValues]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const { name, school, grade, studentPhone, parentPhone } = form;
    if (!name?.trim()) {
      setError('이름을 입력하세요.');
      return;
    }
    if (!school?.trim()) {
      setError('학교를 입력하세요.');
      return;
    }
    if (!grade?.trim()) {
      setError('학년을 입력하세요.');
      return;
    }
    if (!studentPhone?.trim()) {
      setError('학생 전화번호를 입력하세요.');
      return;
    }
    if (!parentPhone?.trim()) {
      setError('학부모 전화번호를 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const payload: StudentFormValues = {
        name: name.trim(),
        school: school.trim(),
        grade: grade.trim(),
        studentPhone: studentPhone.trim(),
        parentPhone: parentPhone.trim(),
        studentLoginId: form.studentLoginId?.trim() || undefined,
        studentPassword: form.studentPassword?.trim() || undefined,
        parentLoginId: form.parentLoginId?.trim() || undefined,
        parentPassword: form.parentPassword?.trim() || undefined,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div
        className="flex flex-col max-h-[85vh] w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더: 고정 */}
        <div className="shrink-0 p-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-950">
            {mode === 'create' ? '학생 등록' : '학생 수정'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* 중간 입력 영역: 스크롤 적용 */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>이름</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                  placeholder="이름"
                />
              </div>
              <div>
                <label className={labelClass}>학교</label>
                <input
                  type="text"
                  value={form.school}
                  onChange={(e) => setForm((p) => ({ ...p, school: e.target.value }))}
                  className={inputClass}
                  placeholder="학교"
                />
              </div>
              <div>
                <label className={labelClass}>학년</label>
                <input
                  type="text"
                  value={form.grade}
                  onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                  className={inputClass}
                  placeholder="예: 중2, 고1"
                />
              </div>
              <div>
                <label className={labelClass}>학생 전화번호</label>
                <input
                  type="text"
                  value={form.studentPhone}
                  onChange={(e) => setForm((p) => ({ ...p, studentPhone: e.target.value }))}
                  className={`${inputClass} font-number`}
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className={labelClass}>학부모 전화번호</label>
                <input
                  type="text"
                  value={form.parentPhone}
                  onChange={(e) => setForm((p) => ({ ...p, parentPhone: e.target.value }))}
                  className={`${inputClass} font-number`}
                  placeholder="010-0000-0000"
                />
              </div>
            </div>

            <hr className="my-6 border-slate-100" />

            <div className="space-y-4">
              <h3 className={labelClass}>로그인 정보 (선택)</h3>
              <p className="text-[12px] text-slate-500 leading-relaxed mb-1">
                비워두면 해당 전화번호로 자동 설정됩니다. 수정 시 비밀번호는 변경할 때만 입력하세요.
              </p>
              <div>
                <label className={labelClass}>학생 로그인 ID</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={form.studentLoginId ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, studentLoginId: e.target.value }))}
                  className={inputClass}
                  placeholder="비워두면 학생 전화번호로 설정"
                />
              </div>
              <div>
                <label className={labelClass}>학생 비밀번호</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.studentPassword ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, studentPassword: e.target.value }))}
                  className={inputClass}
                  placeholder={mode === 'edit' ? '변경 시에만 입력' : '비워두면 학생 전화번호로 설정'}
                />
              </div>
              <div>
                <label className={labelClass}>학부모 로그인 ID</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={form.parentLoginId ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, parentLoginId: e.target.value }))}
                  className={inputClass}
                  placeholder="비워두면 학부모 전화번호로 설정"
                />
              </div>
              <div>
                <label className={labelClass}>학부모 비밀번호</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.parentPassword ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, parentPassword: e.target.value }))}
                  className={inputClass}
                  placeholder={mode === 'edit' ? '변경 시에만 입력' : '비워두면 학부모 전화번호로 설정'}
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>
            )}
          </div>

          {/* 하단 버튼 바: 고정 */}
          <div className="shrink-0 p-6 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-950 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
