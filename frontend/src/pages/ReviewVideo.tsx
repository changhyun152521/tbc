import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';

interface VideoData {
  youtubeVideoId: string;
  lessonDayId: string;
  periodId: string;
  date: string;
  period: number;
  lastPositionSec: number;
  maxPercent: number;
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

export default function ReviewVideo() {
  const { lessonDayId, periodId } = useParams<{ lessonDayId: string; periodId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<VideoData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [percent, setPercent] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const watchedRef = useRef<Set<number>>(new Set());
  const tickRef = useRef<number | null>(null);
  const lastFlushRef = useRef(0);

  const flush = useCallback(async (player: YTPlayer | null) => {
    if (!player || !lessonDayId || !periodId) return;
    const duration = player.getDuration() || 0;
    const currentTime = player.getCurrentTime() || 0;
    const watchedSec = watchedRef.current.size;
    try {
      const res = await apiClient.put<{ success: boolean; data?: { maxPercent: number } }>(
        '/student/review-videos/progress',
        { lessonDayId, periodId, currentTime, watchedSec, durationSec: duration }
      );
      if (res.data.success && res.data.data) setPercent(res.data.data.maxPercent);
    } catch {
      // ignore heartbeat errors
    }
  }, [lessonDayId, periodId]);

  useEffect(() => {
    if (!lessonDayId || !periodId) return;
    let cancelled = false;
    apiClient
      .get<{ success: boolean; data: VideoData }>(`/student/review-videos/${lessonDayId}/${periodId}`)
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.data) {
          setData(res.data.data);
          setPercent(res.data.data.maxPercent ?? 0);
        } else {
          setError('영상을 불러올 수 없습니다.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(msg || '영상을 불러올 수 없습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonDayId, periodId]);

  useEffect(() => {
    if (!data?.youtubeVideoId || !hostRef.current) return;
    let destroyed = false;

    const startTick = (player: YTPlayer) => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = window.setInterval(() => {
        const t = Math.floor(player.getCurrentTime() || 0);
        if (t >= 0) watchedRef.current.add(t);
        const now = Date.now();
        if (now - lastFlushRef.current > 8000) {
          lastFlushRef.current = now;
          void flush(player);
        }
      }, 1000);
    };

    const stopTick = () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };

    void loadYoutubeApi().then(() => {
      if (destroyed || !hostRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId: data.youtubeVideoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            if (data.lastPositionSec > 3) e.target.seekTo(data.lastPositionSec, true);
          },
          onStateChange: (e) => {
            const playing = window.YT?.PlayerState.PLAYING;
            const paused = window.YT?.PlayerState.PAUSED;
            const ended = window.YT?.PlayerState.ENDED;
            if (e.data === playing) startTick(e.target);
            if (e.data === paused || e.data === ended) {
              stopTick();
              void flush(e.target);
            }
          },
        },
      });
    });

    const onHide = () => {
      void flush(playerRef.current);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    return () => {
      destroyed = true;
      stopTick();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void flush(playerRef.current);
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, [data?.youtubeVideoId, data?.lastPositionSec, flush]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-500 text-sm">로딩 중...</div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <p className="text-red-600 text-sm mb-4">{error || '영상을 찾을 수 없습니다.'}</p>
        <button type="button" onClick={() => navigate(-1)} className="text-slate-900 font-medium">
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link to="/student/lessons" className="text-sm text-slate-500 hover:text-slate-800">
        ← 진도/과제
      </Link>
      <h1 className="text-xl font-title font-bold text-slate-950 mt-3 mb-1">
        {data.date} · {data.period}교시 복습 영상
      </h1>
      <p className="text-sm text-slate-500 mb-4">시청률 {Math.round(percent)}%</p>
      <div className="aspect-video w-full bg-slate-900 rounded-xl overflow-hidden">
        <div ref={hostRef} className="w-full h-full" />
      </div>
    </div>
  );
}
