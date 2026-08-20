import { useState } from 'react';
import { apiClient } from '../../api/client';

interface CommentReplySectionProps {
  lessonDayId: string;
  periodId: string;
  savedReply?: string;
  savedReplyCreatedAt?: string;
  savedReplyUpdatedAt?: string;
  likedTeacherNames?: string[];
  teacherComment?: string;
  apiPrefix: 'student' | 'parent';
  onSaved: (body: string, savedAt?: string, createdAt?: string) => void;
  onDeleted?: () => void;
}

export default function CommentReplySection({
  lessonDayId,
  periodId,
  savedReply,
  savedReplyCreatedAt,
  savedReplyUpdatedAt,
  likedTeacherNames,
  teacherComment,
  apiPrefix,
  onSaved,
  onDeleted,
}: CommentReplySectionProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const replyText = (savedReply ?? '').trim();
  const hasReply = replyText !== '';
  const isEdited = Boolean(savedReplyCreatedAt && savedReplyUpdatedAt && savedReplyCreatedAt !== savedReplyUpdatedAt);
  const likeLabel =
    (likedTeacherNames ?? []).length > 0
      ? `${(likedTeacherNames ?? []).map((name) => `${name} 선생님`).join(', ')}이 좋아요`
      : '';
  const busy = saving || deleting;

  const openModal = () => {
    setDraft(savedReply ?? '');
    setError('');
    setOpen(true);
  };

  const closeModal = () => {
    if (busy) return;
    setOpen(false);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.post(`/${apiPrefix}/lessons/${lessonDayId}/${periodId}/reply`, { body: draft });
      const savedAt = new Date().toISOString();
      onSaved(draft, savedAt, savedReplyCreatedAt || savedReplyUpdatedAt || (draft.trim() ? savedAt : undefined));
      setOpen(false);
    } catch {
      setError('답글을 저장할 수 없습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('답글을 삭제할까요? 좋아요와 관련 알림도 함께 정리됩니다.')) return;
    setDeleting(true);
    setError('');
    try {
      await apiClient.post(`/${apiPrefix}/lessons/${lessonDayId}/${periodId}/reply`, { body: '' });
      onDeleted?.();
      setOpen(false);
    } catch {
      setError('답글을 삭제할 수 없습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="mt-2.5 pl-3 border-l-2 border-slate-200">
        {hasReply ? (
          <>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11px] font-medium text-slate-400">답글</span>
              {isEdited && <span className="text-[10px] text-slate-300">· 수정됨</span>}
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{replyText}</p>
            {likeLabel && <p className="mt-1 text-[11px] text-rose-400/80">{likeLabel}</p>}
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={openModal}
                disabled={busy}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                수정하기
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={busy}
                className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={openModal}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            답글 남기기
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-md p-5 sm:p-6 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="comment-reply-title"
          >
            <h2 id="comment-reply-title" className="text-base font-semibold text-slate-800 mb-1">
              {hasReply ? '답글 수정' : '답글 남기기'}
            </h2>
            {teacherComment && (
              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed line-clamp-2">
                선생님 코멘트 · {teacherComment}
              </p>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="답글을 입력해 주세요"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[13px] text-slate-700 leading-relaxed placeholder:text-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none resize-y"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={busy}
                className="flex-1 py-2.5 border border-slate-100 rounded-xl text-[13px] text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={busy || !draft.trim()}
                className="flex-1 py-2.5 bg-slate-700 text-white rounded-xl text-[13px] font-medium hover:bg-slate-800 disabled:opacity-50"
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
