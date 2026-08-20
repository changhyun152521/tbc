import { useState } from 'react';
import { apiClient } from '../../api/client';

interface CommentReplySectionProps {
  lessonDayId: string;
  periodId: string;
  savedReply?: string;
  teacherComment?: string;
  apiPrefix: 'student' | 'parent';
  onSaved: (body: string) => void;
}

export default function CommentReplySection({
  lessonDayId,
  periodId,
  savedReply,
  teacherComment,
  apiPrefix,
  onSaved,
}: CommentReplySectionProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const replyText = (savedReply ?? '').trim();
  const hasReply = replyText !== '';

  const openModal = () => {
    setDraft(savedReply ?? '');
    setError('');
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.post(`/${apiPrefix}/lessons/${lessonDayId}/${periodId}/reply`, { body: draft });
      onSaved(draft);
      setOpen(false);
    } catch {
      setError('답글을 저장할 수 없습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mt-2 flex flex-col items-start gap-1.5">
        {hasReply && (
          <p className="text-[12px] text-slate-500 leading-relaxed whitespace-pre-wrap">
            내 답글: {replyText}
          </p>
        )}
        <button
          type="button"
          onClick={openModal}
          className="text-[12px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          {hasReply ? '수정하기' : '답글 남기기'}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="comment-reply-title"
          >
            <h2 id="comment-reply-title" className="text-lg font-bold text-slate-950 mb-1">
              {hasReply ? '답글 수정' : '답글 남기기'}
            </h2>
            {teacherComment && (
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">선생님 코멘트: {teacherComment}</p>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="답글을 입력해 주세요"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none resize-y"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
