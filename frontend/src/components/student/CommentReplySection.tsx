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

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-6.7-4.35-9.33-7.4C.6 11.2 1.1 7.7 3.7 6.1c1.7-1.05 3.9-.7 5.3.7L12 9.1l3-2.3c1.4-1.4 3.6-1.75 5.3-.7 2.6 1.6 3.1 5.1.03 7.5C18.7 16.65 12 21 12 21z" />
    </svg>
  );
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
  const hasLike = (likedTeacherNames ?? []).length > 0;
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
          <p className="text-[13px] text-slate-600 leading-relaxed">
            <span className="font-medium text-slate-400">답글</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="whitespace-pre-wrap">{replyText}</span>
            {isEdited && <span className="ml-1 text-[10px] text-slate-300">수정됨</span>}
            {hasLike && (
              <span className="inline-flex align-middle ml-1.5 text-rose-400" title="좋아요">
                <HeartIcon className="w-3.5 h-3.5" />
              </span>
            )}
            <button
              type="button"
              onClick={openModal}
              disabled={busy}
              className="ml-2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy}
              className="ml-1.5 text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </p>
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
