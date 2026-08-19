import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';

interface VideoInfo {
  videoIndex: number;
  youtubeVideoId: string;
  title: string;
  lastPositionSec: number;
  maxPercent: number;
  playTimeSec: number;
  watchedSec: number;
  durationSec: number;
  completed: boolean;
}

interface PeriodVideoData {
  lessonDayId: string;
  periodId: string;
  date: string;
  period: number;
  videos: VideoInfo[];
  totalPercent: number;
  totalDurationSec: number;
  totalWatchedSec: number;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}시간 ${m % 60}분 ${r}초`;
  }
  return `${m}분 ${r}초`;
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

  const [data, setData] = useState<PeriodVideoData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  // 영상별 시청 상태 (클라이언트 세션)
  const [videoPercents, setVideoPercents] = useState<number[]>([]);
  const [videoPlayTimes, setVideoPlayTimes] = useState<number[]>([]);
  const [totalPercent, setTotalPercent] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const watchedRef = useRef<Set<number>>(new Set());
  const baselineWatchedSecRef = useRef(0);
  const playTimeRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const lastFlushRef = useRef(0);
  const lastPositionByIndexRef = useRef<number[]>([]);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const activeVideo = data?.videos[activeIndex] ?? null;
  const flushRef = useRef<(
    player: YTPlayer | null,
    index?: number,
    snapshot?: { watchedSec: number; playTimeSec: number }
  ) => Promise<void>>(async () => {});
  const videoCountRef = useRef(0);
  videoCountRef.current = data?.videos.length ?? 0;

  const flush = useCallback(
    async (
      player: YTPlayer | null,
      index = activeIndexRef.current,
      snapshot?: { watchedSec: number; playTimeSec: number }
    ) => {
      const video = data?.videos[index];
      if (!player || !lessonDayId || !periodId || !video) return;
      let duration = 0;
      let currentTime = 0;
      try {
        duration = player.getDuration() || 0;
        currentTime = player.getCurrentTime() || 0;
      } catch {
        return;
      }
      lastPositionByIndexRef.current[index] = currentTime;
      const watchedSec = snapshot?.watchedSec ?? baselineWatchedSecRef.current + watchedRef.current.size;
      const playTimeSec = snapshot?.playTimeSec ?? playTimeRef.current;
      try {
        const res = await apiClient.put<{
          success: boolean;
          data?: { maxPercent: number; playTimeSec: number; watchedSec: number; totalPercent: number };
        }>('/student/review-videos/progress', {
          lessonDayId,
          periodId,
          videoIndex: video.videoIndex,
          youtubeVideoId: video.youtubeVideoId,
          currentTime,
          watchedSec,
          playTimeSec,
          durationSec: duration,
        });
        if (res.data.success && res.data.data) {
          const d = res.data.data;
          setVideoPercents((prev) => {
            const next = [...prev];
            next[index] = d.maxPercent;
            return next;
          });
          if (typeof d.totalPercent === 'number') {
            setTotalPercent(d.totalPercent);
          }
          if (index !== activeIndexRef.current) return;
          if (typeof d.watchedSec === 'number') {
            baselineWatchedSecRef.current = d.watchedSec;
            watchedRef.current.clear();
          }
          if (typeof d.playTimeSec === 'number') {
            playTimeRef.current = Math.max(playTimeRef.current, d.playTimeSec);
            setVideoPlayTimes((prev) => {
              const next = [...prev];
              next[index] = playTimeRef.current;
              return next;
            });
          }
        }
      } catch {
        // ignore heartbeat errors
      }
    },
    [lessonDayId, periodId, data]
  );
  flushRef.current = flush;

  // 초기 데이터 로드
  useEffect(() => {
    if (!lessonDayId || !periodId) return;
    let cancelled = false;
    apiClient
      .get<{ success: boolean; data: PeriodVideoData }>(`/student/review-videos/${lessonDayId}/${periodId}`)
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.data) {
          const d = res.data.data;
          setData(d);
          setTotalPercent(d.totalPercent ?? 0);
          setVideoPercents(d.videos.map((v) => v.maxPercent ?? 0));
          setVideoPlayTimes(d.videos.map((v) => v.playTimeSec ?? 0));
          lastPositionByIndexRef.current = d.videos.map((v) => v.lastPositionSec ?? 0);
          // 첫 미완료 영상으로 이동
          const firstUnfinished = d.videos.findIndex((v) => !v.completed);
          setActiveIndex(firstUnfinished >= 0 ? firstUnfinished : 0);
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

  // activeIndex 변경 시 ref 초기화
  useEffect(() => {
    if (!activeVideo) return;
    baselineWatchedSecRef.current = activeVideo.watchedSec ?? 0;
    watchedRef.current.clear();
    playTimeRef.current = activeVideo.playTimeSec ?? 0;
  }, [activeIndex, activeVideo]);

  // 플레이어 마운트/교체 — YouTube가 host div를 iframe으로 바꿔 버리므로
  // React가 소유하는 wrapper 안에 매번 새 host를 만든다.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const videoId = activeVideo?.youtubeVideoId;
    const playerIndex = activeIndex;
    if (!wrapper || !videoId) return;
    let destroyed = false;
    let autoNextTimer: number | null = null;

    const startTick = (player: YTPlayer) => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = window.setInterval(() => {
        const playing = window.YT?.PlayerState.PLAYING;
        if (playing != null && player.getPlayerState() !== playing) return;
        const t = Math.floor(player.getCurrentTime() || 0);
        if (t >= 0) watchedRef.current.add(t);
        playTimeRef.current += 1;
        setVideoPlayTimes((prev) => {
          const next = [...prev];
          next[activeIndex] = playTimeRef.current;
          return next;
        });
        const now = Date.now();
        if (now - lastFlushRef.current > 8000) {
          lastFlushRef.current = now;
          void flushRef.current(player, playerIndex);
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

    void loadYoutubeApi().then(() => {
      if (destroyed || !window.YT || !host.isConnected) return;
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = new window.YT.Player(host, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            if (destroyed) return;
            const resumeAt = lastPositionByIndexRef.current[playerIndex] ?? 0;
            if (resumeAt > 3) e.target.seekTo(resumeAt, true);
            void flushRef.current(e.target, playerIndex);
          },
          onStateChange: (e) => {
            if (destroyed) return;
            const playing = window.YT?.PlayerState.PLAYING;
            const paused = window.YT?.PlayerState.PAUSED;
            const ended = window.YT?.PlayerState.ENDED;
            if (e.data === playing) startTick(e.target);
            if (e.data === paused || e.data === ended) {
              stopTick();
              void flushRef.current(e.target, playerIndex);
              if (e.data === ended && playerIndex < videoCountRef.current - 1) {
                autoNextTimer = window.setTimeout(() => {
                  setActiveIndex((prev) => prev + 1);
                }, 1500);
              }
            }
          },
        },
      });
    });

    const onHide = () => { void flushRef.current(playerRef.current, playerIndex); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    return () => {
      destroyed = true;
      if (autoNextTimer != null) window.clearTimeout(autoNextTimer);
      stopTick();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      const snapshot = {
        watchedSec: baselineWatchedSecRef.current + watchedRef.current.size,
        playTimeSec: playTimeRef.current,
      };
      void flushRef.current(playerRef.current, playerIndex, snapshot);
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
      wrapper.replaceChildren();
    };
  }, [activeIndex, activeVideo?.youtubeVideoId]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-slate-500 text-sm">로딩 중...</div>;
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

  const videos = data.videos;
  const isSingle = videos.length === 1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link to="/student/lessons" className="text-sm text-slate-500 hover:text-slate-800">
        ← 진도/과제
      </Link>
      <h1 className="text-xl font-title font-bold text-slate-950 mt-3 mb-1">
        {data.date} · {data.period}교시 복습 영상
      </h1>

      {/* 전체 진행률 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-sky-500 transition-all duration-500"
            style={{ width: `${Math.round(totalPercent)}%` }}
          />
        </div>
        <span className="text-sm text-slate-600 font-medium whitespace-nowrap">
          전체 {Math.round(totalPercent)}%
        </span>
      </div>

      {/* 영상 목록 탭 (다중 영상일 때만) */}
      {!isSingle && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {videos.map((v, i) => {
            const pct = videoPercents[i] ?? v.maxPercent;
            const isCompleted = pct >= 90;
            const isActive = i === activeIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors
                  ${isActive ? 'bg-slate-900 text-white border-slate-900' : isCompleted ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                {isCompleted ? <span className="text-xs">✓</span> : null}
                {v.title ? v.title : `${i + 1}번 영상`}
                <span className="text-xs opacity-70">{Math.round(pct)}%</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 영상 플레이어 */}
      <div className="aspect-video w-full bg-slate-900 rounded-xl overflow-hidden mb-3">
        <div ref={wrapperRef} className="w-full h-full" />
      </div>

      {/* 현재 영상 정보 */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {!isSingle && `${activeIndex + 1}번 영상 · `}
          진행률 {Math.round(videoPercents[activeIndex] ?? activeVideo?.maxPercent ?? 0)}%
          {' · '}시청 시간 {formatTime(videoPlayTimes[activeIndex] ?? activeVideo?.playTimeSec ?? 0)}
        </span>
        {!isSingle && activeIndex < videos.length - 1 && (
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => prev + 1)}
            className="text-sky-700 font-medium hover:text-sky-900"
          >
            다음 영상 →
          </button>
        )}
      </div>
    </div>
  );
}
