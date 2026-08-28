import { useState, useEffect, FormEvent } from 'react';
import type { ReviewVideoItem } from '../../types/lesson';
import { extractYoutubeVideoId } from '../../utils/youtube';

interface ReviewVideoRegisterModalProps {
  open: boolean;
  initialVideos: ReviewVideoItem[];
  onClose: () => void;
  /** 초안 적용 (서버 저장은 교시 저장 시 함께 수행) */
  onApply: (videos: ReviewVideoItem[]) => void;
}

export default function ReviewVideoRegisterModal({
  open,
  initialVideos,
  onClose,
  onApply,
}: ReviewVideoRegisterModalProps) {
  const [videos, setVideos] = useState<ReviewVideoItem[]>([]);

  useEffect(() => {
    if (open) {
      setVideos(initialVideos.length > 0 ? initialVideos.map((v, i) => ({ ...v, order: i })) : []);
    }
  }, [open, initialVideos]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onApply(
      videos.map((v, i) => ({
        ...v,
        order: i,
        videoId: extractYoutubeVideoId(v.url ?? '') ?? v.videoId ?? '',
      }))
    );
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div
        className="flex flex-col max-h-[85vh] w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-950">복습영상 등록</h2>
          <p className="text-sm text-slate-500 mt-1">
            유튜브 URL을 입력하세요. 적용 후 교시 <span className="font-semibold text-slate-700">저장</span>을 눌러야
            반영됩니다.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4 space-y-3">
            {videos.length === 0 ? (
              <p className="text-sm text-slate-400">등록된 영상이 없습니다.</p>
            ) : (
              videos.map((v, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-slate-500 font-bold w-5 pt-2 shrink-0">{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={v.title ?? ''}
                      onChange={(e) =>
                        setVideos((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                      }
                      placeholder="영상 제목 (선택)"
                      className={inputClass}
                    />
                    <input
                      type="url"
                      value={v.url}
                      onChange={(e) =>
                        setVideos((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                      }
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setVideos((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-lg leading-none pt-2 shrink-0"
                    aria-label="영상 삭제"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
            <button
              type="button"
              onClick={() => setVideos((prev) => [...prev, { url: '', videoId: '', title: '', order: prev.length }])}
              className="text-sm text-sky-700 font-medium hover:text-sky-900"
            >
              + 영상 추가
            </button>
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
              className="flex-1 py-2.5 bg-slate-950 text-white rounded-lg font-medium hover:bg-slate-800"
            >
              적용
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
