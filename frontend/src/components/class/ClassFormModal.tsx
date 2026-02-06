import { useState, useEffect, FormEvent } from 'react';
import type { ClassFormValues } from '../../types/class';

interface ClassFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: ClassFormValues | null;
  onClose: () => void;
  onSubmit: (values: ClassFormValues) => Promise<void>;
}

const emptyForm: ClassFormValues = {
  name: '',
  teacherIds: [],
  description: '',
};

export default function ClassFormModal({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: ClassFormModalProps) {
  const [form, setForm] = useState<ClassFormValues>(emptyForm);
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
    const name = form.name?.trim();
    if (!name) {
      setError('반 이름을 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        name,
        teacherIds: [],
        description: form.description?.trim() ?? '',
      });
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
            {mode === 'create' ? '반 등록' : '반 수정'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>반 이름 (필수)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                  placeholder="반 이름"
                />
              </div>
              <div>
                <label className={labelClass}>반 설명 (메모, 선택)</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className={`${inputClass} min-h-[80px] resize-y`}
                  placeholder="반에 대한 메모"
                />
              </div>
            </div>
            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>
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
