import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';

interface QuestionVideoData {
  _id: string;
  url: string;
  videoId: string;
  title: string;
  teacherName: string;
  createdAt: string;
  maxPercent: number;
  lastPositionSec: number;
  watchedSec: number;
  playTimeSec: number;
  durationSec: number;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (sec: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
}

function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    } else if (window.YT?.Player) {
      resolve();
    }
  });
}

export default function QuestionVideo() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<QuestionVideoData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [startChoice, setStartChoice] = useState<'ask' | 'resume' | 'restart' | null>(null);
  const [displayPercent, setDisplayPercent] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const watchedRef = useRef<Set<number>>(new Set());
  const baselineWatchedSecRef = useRef(0);
  const playTimeRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const lastFlushRef = useRef(0);
  const lastPositionRef = useRef(0);
  const flushRef = useRef<(
    player: YTPlayer | null,
    snapshot?: { watchedSec: number; playTimeSec: number }
  ) => Promise<void>>(async () => {});

  useEffect(() => {
    if (!id) {
      setError('영상 ID가 없습니다.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    apiClient
      .get<{ success: boolean; data: QuestionVideoData; message?: string }>(
        `/student/question-videos/${id}`
      )
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.data) {
          const d = res.data.data;
          setData(d);
          setDisplayPercent(d.maxPercent ?? 0);
          lastPositionRef.current = d.lastPositionSec ?? 0;
          baselineWatchedSecRef.current = d.watchedSec ?? 0;
          playTimeRef.current = d.playTimeSec ?? 0;
          const hasProgress = (d.lastPositionSec ?? 0) > 3 || (d.watchedSec ?? 0) > 0;
          setStartChoice(hasProgress ? 'ask' : 'restart');
        } else {
          setData(null);
          setError(res.data.message ?? '영상을 불러올 수 없습니다.');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message ===
          'string'
            ? (err as { response: { data: { message: string } } }).response.data.message
            : '영상을 불러올 수 없습니다.';
        setError(msg);
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const flush = useCallback(
    async (
      player: YTPlayer | null,
      snapshot?: { watchedSec: number; playTimeSec: number }
    ) => {
      if (!data) return;
      const duration = Math.max(0, Math.floor(player?.getDuration?.() || data.durationSec || 0));
      const currentTime = Math.max(0, Math.floor(player?.getCurrentTime?.() || lastPositionRef.current || 0));
      const watchedSec = snapshot?.watchedSec ?? baselineWatchedSecRef.current + watchedRef.current.size;
      const playTimeSec = snapshot?.playTimeSec ?? playTimeRef.current;
      lastPositionRef.current = currentTime;
      try {
        const res = await apiClient.put<{
          success: boolean;
          data: { maxPercent: number; watchedSec: number; playTimeSec: number };
        }>('/student/question-videos/progress', {
          videoId: data._id,
          youtubeVideoId: data.videoId,
          currentTime,
          watchedSec,
          playTimeSec,
          durationSec: duration,
        });
        if (res.data.success && res.data.data) {
          setDisplayPercent(res.data.data.maxPercent ?? 0);
          baselineWatchedSecRef.current = res.data.data.watchedSec ?? watchedSec;
          playTimeRef.current = res.data.data.playTimeSec ?? playTimeSec;
          watchedRef.current.clear();
        }
      } catch {
        // ignore transient flush errors
      }
    },
    [data]
  );
  flushRef.current = flush;

  useEffect(() => {
    if (startChoice !== 'resume' && startChoice !== 'restart') return;
    const wrapper = wrapperRef.current;
    const videoId = data?.videoId;
    if (!wrapper || !videoId) return;
    let destroyed = false;

    const startTick = (player: YTPlayer) => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = window.setInterval(() => {
        const playing = window.YT?.PlayerState.PLAYING;
        if (playing != null && player.getPlayerState() !== playing) return;
        const t = Math.floor(player.getCurrentTime() || 0);
        if (t >= 0) watchedRef.current.add(t);
        playTimeRef.current += 1;
        const now = Date.now();
        if (now - lastFlushRef.current > 8000) {
          lastFlushRef.current = now;
          void flushRef.current(player);
        }
      }, 1000);
    };

    const stopTick = () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };

    wrapper.replaceChildren();
    const host = document.createElement('div');
    host.style.width = '100%';
    host.style.height = '100%';
    wrapper.appendChild(host);

    const shouldSeek = startChoice === 'resume';

    void loadYoutubeApi().then(() => {
      if (destroyed || !window.YT || !host.isConnected) return;
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = new window.YT.Player(host, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            if (destroyed) return;
            const resumeAt = shouldSeek ? lastPositionRef.current : 0;
            if (resumeAt > 3) e.target.seekTo(resumeAt, true);
            void flushRef.current(e.target);
          },
          onStateChange: (e) => {
            if (destroyed) return;
            const playing = window.YT?.PlayerState.PLAYING;
            const paused = window.YT?.PlayerState.PAUSED;
            const ended = window.YT?.PlayerState.ENDED;
            if (e.data === playing) startTick(e.target);
            if (e.data === paused || e.data === ended) {
              stopTick();
              void flushRef.current(e.target);
            }
          },
        },
      });
    });

    const onHide = () => {
      void flushRef.current(playerRef.current);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    return () => {
      destroyed = true;
      stopTick();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      const snapshot = {
        watchedSec: baselineWatchedSecRef.current + watchedRef.current.size,
        playTimeSec: playTimeRef.current,
      };
      void flushRef.current(playerRef.current, snapshot);
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      wrapper.replaceChildren();
    };
  }, [startChoice, data?.videoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-6 pb-12">
        <div className="max-w-lg mx-auto w-full py-12 text-center text-slate-400 text-sm font-medium">
          로딩 중...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-6 pb-12">
        <div className="max-w-lg mx-auto w-full space-y-4">
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium" role="alert">
            {error || '영상을 찾을 수 없습니다.'}
          </div>
          <Link
            to="/student/dashboard"
            className="inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← 홈으로
          </Link>
        </div>
      </div>
    );
  }

  if (startChoice === 'ask') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-4 px-4 sm:px-6 pb-12">
        <div className="max-w-lg mx-auto w-full">
          <Link to="/student/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
            ← 홈으로
          </Link>
          <h1 className="text-lg font-bold text-slate-900 mt-3">{data.title || '질문 영상'}</h1>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50">
            <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6">
              <h2 className="text-lg font-bold text-slate-950 mb-2">이어서 볼까요?</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                이전에 보던 지점이 있습니다. 이어서 시청할까요?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setStartChoice('resume')}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold"
                >
                  이어서 보기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    lastPositionRef.current = 0;
                    setStartChoice('restart');
                  }}
                  className="w-full py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700"
                >
                  처음부터 보기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-4 px-4 sm:px-6 pb-12 font-sans text-slate-950">
      <div className="max-w-lg mx-auto w-full space-y-4">
        <Link
          to="/student/dashboard"
          className="inline-block text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← 홈으로
        </Link>
        <div className="bg-white border border-slate-100 rounded-[20px] p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{data.title || '질문 영상'}</h1>
            {data.teacherName && (
              <p className="text-[13px] text-slate-500 mt-1">{data.teacherName} 선생님</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${Math.round(displayPercent)}%` }}
              />
            </div>
            <span className="text-sm text-slate-600 font-medium whitespace-nowrap">
              {Math.round(displayPercent)}%
            </span>
          </div>
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900">
            <div ref={wrapperRef} className="absolute inset-0 w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
