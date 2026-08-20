import { useEffect, useRef, useState } from 'react';
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

function ThumbsUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 21h8.2c.9 0 1.7-.6 1.9-1.4l1.4-5.8c.2-.9-.4-1.8-1.3-1.8H14l.7-3.4.1-.7c0-.4-.2-.8-.4-1.1L13 5 8.1 10.1c-.3.3-.5.7-.5 1.1V19c0 1.1.9 2 1.4 2zM4 10h2.5C7.3 10 8 10.7 8 11.5V19c0 .8-.7 1.5-1.5 1.5H4c-.8 0-1.5-.7-1.5-1.5v-7C2.5 10.7 3.2 10 4 10z" />
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
  const [likeTipOpen, setLikeTipOpen] = useState(false);
  const likeTipRef = useRef<HTMLSpanElement | null>(null);

  const replyText = (savedReply ?? '').trim();
  const hasReply = replyText !== '';
  const isEdited = Boolean(savedReplyCreatedAt && savedReplyUpdatedAt && savedReplyCreatedAt !== savedReplyUpdatedAt);

  const likedNames = likedTeacherNames ?? [];
  const hasLike = likedNames.length > 0;
  const busy = saving || deleting;

  const likeTipText =
    likedNames.length === 1
      ? `${likedNames[0]} 선생님이 답글에 좋아요를 눌렀습니다.`
      : `${likedNames[0]} 선생님 외 ${likedNames.length - 1}명이 답글에 좋아요를 눌렀습니다.`;

  useEffect(() => {
    if (!likeTipOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (likeTipRef.current && target && !likeTipRef.current.contains(target)) setLikeTipOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLikeTipOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [likeTipOpen]);

  const openModal = () => {
    setDraft(savedReply ?? '');
    setError('');
    setLikeTipOpen(false);
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
      {!hasReply ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={openModal}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            답글 남기기
          </button>
        </div>
      ) : (
        <div className="mt-2.5 pl-3 border-l-2 border-slate-200">
          <div className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">
            <span className="font-medium text-slate-400">답글</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>{replyText}</span>
            {isEdited && <span className="ml-1 text-[10px] text-slate-300">수정됨</span>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {hasLike && (
              <span ref={likeTipRef} className="relative inline-flex">
                <button
                  type="button"
                  onClick={() => setLikeTipOpen((prev) => !prev)}
                  className="inline-flex items-center text-sky-500 hover:text-sky-600 transition-colors"
                  aria-label="좋아요 정보 보기"
                >
                  <ThumbsUpIcon className="w-3.5 h-3.5" />
                </button>
                {likeTipOpen && (
                  <span className="absolute left-0 bottom-[calc(100%+6px)] z-20 w-max max-w-[min(220px,calc(100vw-2rem))] rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg sm:left-1/2 sm:-translate-x-1/2">
                    {likeTipText}
                    <span className="absolute left-2.5 top-full border-4 border-transparent border-t-slate-800 sm:left-1/2 sm:-translate-x-1/2" />
                  </span>
                )}
              </span>
            )}
            <button
              type="button"
              onClick={openModal}
              disabled={busy}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      )}

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
