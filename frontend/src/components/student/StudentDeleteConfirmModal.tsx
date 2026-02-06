import { useState } from 'react';

interface StudentDeleteConfirmModalProps {
  open: boolean;
  studentName?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function StudentDeleteConfirmModal({
  open,
  studentName,
  onClose,
  onConfirm,
}: StudentDeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-slate-800 font-medium">
          {studentName ? `"${studentName}" 학생을 정말 삭제하시겠습니까?` : '정말 삭제하시겠습니까?'}
        </p>
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '처리 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
