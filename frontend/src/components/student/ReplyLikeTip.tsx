import { useEffect, useRef, useState } from 'react';

function ThumbsUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 21h8.2c.9 0 1.7-.6 1.9-1.4l1.4-5.8c.2-.9-.4-1.8-1.3-1.8H14l.7-3.4.1-.7c0-.4-.2-.8-.4-1.1L13 5 8.1 10.1c-.3.3-.5.7-.5 1.1V19c0 1.1.9 2 1.4 2zM4 10h2.5C7.3 10 8 10.7 8 11.5V19c0 .8-.7 1.5-1.5 1.5H4c-.8 0-1.5-.7-1.5-1.5v-7C2.5 10.7 3.2 10 4 10z" />
    </svg>
  );
}

export default function ReplyLikeTip({ names }: { names?: string[] }) {
  const likedNames = names ?? [];
  const [likeTipOpen, setLikeTipOpen] = useState(false);
  const likeTipRef = useRef<HTMLSpanElement | null>(null);

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

  if (likedNames.length === 0) return null;

  return (
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
  );
}
