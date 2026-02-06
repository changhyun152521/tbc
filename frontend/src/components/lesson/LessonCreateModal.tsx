import { useState, useEffect, FormEvent } from 'react';
import type { LessonDayFormValues } from '../../types/lesson';

interface LessonCreateModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: LessonDayFormValues | null;
  classOptions: { _id: string; name: string }[];
  onClose: () => void;
  onSubmit: (values: LessonDayFormValues) => Promise<void>;
}

const emptyForm: LessonDayFormValues = {
  date: new Date().toISOString().slice(0, 10),
  classId: '',
};

export default function LessonCreateModal({
  open,
  mode,
  initialValues,
  classOptions,
  onClose,
  onSubmit,
}: LessonCreateModalProps) {
  const [form, setForm] = useState<LessonDayFormValues>(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initialValues
          ? { date: initialValues.date, classId: initialValues.classId }
          : { ...emptyForm, date: new Date().toISOString().slice(0, 10) }
      );
      setError('');
    }
  }, [open, initialValues]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.date?.trim()) {
      setError('날짜를 선택하세요.');
      return;
    }
    if (!form.classId?.trim()) {
      setError('반을 선택하세요.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(form);
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
        <div className="shrink-0 p-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-950">
            {mode === 'create' ? '수업 추가' : '수업 수정'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>날짜 (필수)</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>반 (필수)</label>
                <select
                  value={form.classId}
                  onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">반 선택</option>
                  {classOptions.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>

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
