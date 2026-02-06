import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ChartDataItem {
  date: string;
  fullDate: string;
  name?: string;
  myScore: number | null;
  average: number | null;
  maxScore: number | null;
}

interface ScoreTrendChartProps {
  data: ChartDataItem[];
}

const COLORS = {
  myScore: '#4f46e5', // indigo-600
  average: '#64748b', // slate-500
  maxScore: '#f59e0b', // amber-500
};

function formatFullDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const wd = date.toLocaleDateString('ko-KR', { weekday: 'short' });
    return `${y}.${m}.${d} (${wd})`;
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const wd = date.toLocaleDateString('ko-KR', { weekday: 'short' });
    return `${m}/${day} (${wd})`;
  } catch {
    return dateStr;
  }
}

export default function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, useFixed: false });
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);
  const [dragDirection, setDragDirection] = useState<'horizontal' | 'vertical' | null>(null);

  if (!data || data.length === 0) return null;

  const sortedData = [...data].sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  const validScores = sortedData.flatMap((d) => [
    d.myScore ?? null,
    d.average ?? null,
    d.maxScore ?? null,
  ]).filter((s): s is number => s !== null);

  if (validScores.length === 0) return null;

  const maxScore = Math.max(...validScores);
  const minScore = Math.min(...validScores);
  const scoreRange = maxScore - minScore || 20;
  const padding = Math.max(5, scoreRange * 0.1);
  const chartMax = Math.min(100, Math.ceil(maxScore + padding));
  const chartMin = Math.max(0, Math.floor(minScore - padding));

  const chartHeight = 220;
  const topPadding = 20;
  const minBarWidth = 80;
  const chartContentWidth = Math.max(400, sortedData.length * minBarWidth);
  const sidePadding = 60;
  const chartWidth = chartContentWidth + sidePadding * 2;
  const xStep = sortedData.length > 1 ? chartContentWidth / (sortedData.length - 1) : 0;
  const yStep = (chartHeight - topPadding) / (chartMax - chartMin || 100);

  const getY = (score: number | null | undefined) => {
    if (score === null || score === undefined) return null;
    return chartHeight - topPadding - (score - chartMin) * yStep + topPadding;
  };

  const TOOLTIP_HALF_WIDTH = 88;
  const TOOLTIP_HEIGHT = 130;
  const MARGIN = 16;
  const DRAG_THRESHOLD = 18;

  const getTooltipPositionFromPoint = (clientX: number, clientY: number, useFixed = false) => {
    if (useFixed) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
      const x = Math.max(MARGIN + TOOLTIP_HALF_WIDTH, Math.min(vw - MARGIN - TOOLTIP_HALF_WIDTH, clientX));
      const aboveTop = clientY - TOOLTIP_HEIGHT - MARGIN;
      const belowTop = clientY + MARGIN;
      let top: number;
      if (aboveTop >= MARGIN) {
        top = Math.min(aboveTop, vh - TOOLTIP_HEIGHT - MARGIN);
      } else if (belowTop + TOOLTIP_HEIGHT <= vh - MARGIN) {
        top = belowTop;
      } else {
        top = Math.max(MARGIN, Math.min(vh - TOOLTIP_HEIGHT - MARGIN, clientY - TOOLTIP_HEIGHT / 2));
      }
      return { x, y: top, useFixed: true };
    }
    const wrapper = chartWrapperRef.current;
    if (!wrapper) return { x: 100, y: 24, useFixed: false };
    const wrapperRect = wrapper.getBoundingClientRect();
    const baseX = clientX - wrapperRect.left;
    const baseY = clientY - wrapperRect.top;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    const x = Math.max(MARGIN + TOOLTIP_HALF_WIDTH, Math.min(w - MARGIN - TOOLTIP_HALF_WIDTH, baseX));
    let top: number;
    const aboveTop = baseY - TOOLTIP_HEIGHT - MARGIN;
    const belowTop = baseY + MARGIN;
    if (aboveTop >= MARGIN) {
      top = Math.min(aboveTop, h - TOOLTIP_HEIGHT - MARGIN);
    } else if (belowTop + TOOLTIP_HEIGHT <= h - MARGIN) {
      top = belowTop;
    } else {
      top = Math.max(MARGIN, Math.min(h - TOOLTIP_HEIGHT - MARGIN, baseY - TOOLTIP_HEIGHT / 2));
    }
    return { x, y: top, useFixed: false };
  };

  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  const handleMouseEnter = (index: number, e: React.MouseEvent) => {
    setHoveredIndex(index);
    setTooltipPosition(getTooltipPositionFromPoint(e.clientX, e.clientY, false));
  };

  const handleTooltipMouseMove = (index: number, e: React.MouseEvent) => {
    if (hoveredIndex === index && !isDragging) {
      setTooltipPosition(getTooltipPositionFromPoint(e.clientX, e.clientY, false));
    }
  };

  const handleMouseLeave = () => setHoveredIndex(null);

  const handlePointTap = (index: number, clientX: number, clientY: number, fromTouch = false) => {
    if (!isDragging) {
      setHoveredIndex(index);
      setTooltipPosition(getTooltipPositionFromPoint(clientX, clientY, fromTouch || isTouchDevice));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (chartWrapperRef.current && e.button === 0) {
      setIsDragging(true);
      setHoveredIndex(null);
      setDragStart({ x: e.pageX - chartWrapperRef.current.offsetLeft, scrollLeft: chartWrapperRef.current.scrollLeft });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !chartWrapperRef.current) return;
    e.preventDefault();
    const x = e.pageX - chartWrapperRef.current.offsetLeft;
    chartWrapperRef.current.scrollLeft = dragStart.scrollLeft - (x - dragStart.x) * 2;
  };

  const handleMouseUp = () => {
    if (chartWrapperRef.current) setIsDragging(false);
  };

  const handleMouseLeaveWrapper = () => {
    setIsDragging(false);
    setHoveredIndex(null);
  };

  const handleTouchStart = (e: React.TouchEvent, index?: number) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.pageX, y: touch.pageY };
    if (index != null) {
      e.stopPropagation();
      setTouchStartIndex(index);
      setIsDragging(false);
      setDragDirection(null);
    } else {
      setTouchStartIndex(null);
      setHoveredIndex(null);
      setDragDirection(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !chartWrapperRef.current) return;
    const touch = e.touches[0];
    const { x: startX, y: startY } = touchStartPosRef.current;
    const deltaX = Math.abs(touch.pageX - startX);
    const deltaY = Math.abs(touch.pageY - startY);

    if (!dragDirection && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
      if (deltaY > deltaX) {
        setDragDirection('vertical');
        setHoveredIndex(null);
        return;
      }
      setDragDirection('horizontal');
    }
    if (dragDirection === 'horizontal') {
      setIsDragging(true);
      setHoveredIndex(null);
      e.preventDefault();
      const delta = touch.pageX - startX;
      chartWrapperRef.current.scrollLeft -= delta * 2;
      touchStartPosRef.current = { x: touch.pageX, y: touch.pageY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, index?: number) => {
    if (index != null && !isDragging && touchStartIndex === index) {
      const touch = e.changedTouches[0];
      if (touch) {
        e.preventDefault();
        handlePointTap(index, touch.clientX, touch.clientY, true);
      }
    }
    setTouchStartIndex(null);
    setIsDragging(false);
  };

  const handlePointerUp = (index: number, e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && !isDragging) {
      handlePointTap(index, e.clientX, e.clientY, true);
    }
  };

  useEffect(() => {
    const handleOutsideTouch = (e: TouchEvent) => {
      if (chartWrapperRef.current && !chartWrapperRef.current.contains(e.target as Node)) {
        setHoveredIndex(null);
      }
    };
    document.addEventListener('touchstart', handleOutsideTouch, { capture: true });
    return () => document.removeEventListener('touchstart', handleOutsideTouch, { capture: true });
  }, []);

  const tooltipContent = hoveredIndex !== null && sortedData[hoveredIndex] && !isDragging ? (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-lg px-4 py-3 min-w-[160px] max-w-[200px] pointer-events-none"
      style={{
        position: tooltipPosition.useFixed ? 'fixed' : 'absolute',
        left: `${tooltipPosition.x}px`,
        top: `${tooltipPosition.y}px`,
        transform: 'translate(-50%, 0)',
        zIndex: 9999,
      }}
    >
      <p className="text-[12px] font-bold text-slate-800 mb-2">
        {formatFullDate(sortedData[hoveredIndex].fullDate)}
      </p>
      {sortedData[hoveredIndex].name && (
        <p className="text-[11px] text-slate-500 mb-2 truncate max-w-[200px]">
          {sortedData[hoveredIndex].name}
        </p>
      )}
      <div className="space-y-1 text-[13px] pt-1">
        <p className="flex justify-between gap-4">
          <span className="text-slate-500">내 점수</span>
          <span className="font-semibold text-slate-800">
            {sortedData[hoveredIndex].myScore != null ? `${sortedData[hoveredIndex].myScore}점` : '-'}
          </span>
        </p>
        <p className="flex justify-between gap-4">
          <span className="text-slate-500">반 평균</span>
          <span className="font-semibold text-slate-800">
            {sortedData[hoveredIndex].average != null ? `${sortedData[hoveredIndex].average}점` : '-'}
          </span>
        </p>
        <p className="flex justify-between gap-4">
          <span className="text-slate-500">최고점</span>
          <span className="font-semibold text-slate-800">
            {sortedData[hoveredIndex].maxScore != null ? `${sortedData[hoveredIndex].maxScore}점` : '-'}
          </span>
        </p>
      </div>
    </div>
  ) : null;

  const myScorePath = sortedData
    .map((d, i) => {
      const y = getY(d.myScore);
      if (y === null) return null;
      const x = sidePadding + i * xStep;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .filter((p): p is string => p !== null)
    .join(' ');

  const averagePath = sortedData
    .map((d, i) => {
      const y = getY(d.average);
      if (y === null) return null;
      const x = sidePadding + i * xStep;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .filter((p): p is string => p !== null)
    .join(' ');

  const maxScorePath = sortedData
    .map((d, i) => {
      const y = getY(d.maxScore);
      if (y === null) return null;
      const x = sidePadding + i * xStep;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .filter((p): p is string => p !== null)
    .join(' ');

  return (
    <div className="w-full">
      <div
        ref={chartWrapperRef}
        className="relative overflow-x-auto scrollbar-table"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'manipulation' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeaveWrapper}
        onTouchStart={(e) => handleTouchStart(e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => handleTouchEnd(e)}
      >
        {tooltipContent &&
          (tooltipPosition.useFixed && typeof document !== 'undefined'
            ? createPortal(tooltipContent, document.body)
            : tooltipContent)}
        <div className="relative min-w-max">
          <svg
            ref={svgRef}
            width={chartWidth}
            height={chartHeight + 60}
            className="block"
            onMouseLeave={handleMouseLeave}
          >
            {/* Y축 그리드 */}
            {[0, 25, 50, 75, 100].map((value) => {
              if (value < chartMin || value > chartMax) return null;
              const y = getY(value);
              if (y === null) return null;
              return (
                <line
                  key={value}
                  x1={sidePadding}
                  y1={y}
                  x2={chartWidth - sidePadding}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* 내 점수 라인 */}
            {myScorePath && (
              <path
                d={myScorePath}
                fill="none"
                stroke={COLORS.myScore}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* 반 평균 라인 */}
            {averagePath && (
              <path
                d={averagePath}
                fill="none"
                stroke={COLORS.average}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5 5"
              />
            )}
            {/* 최고점 라인 */}
            {maxScorePath && (
              <path
                d={maxScorePath}
                fill="none"
                stroke={COLORS.maxScore}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* 데이터 포인트 및 호버 영역 */}
            {sortedData.map((d, i) => {
              const x = sidePadding + i * xStep;
              const myY = getY(d.myScore);
              const avgY = getY(d.average);
              const maxY = getY(d.maxScore);
              const shortDate = formatShortDate(d.fullDate).split(' ');

              return (
                <g key={i}>
                  <rect
                    x={x - 50}
                    y={topPadding}
                    width={100}
                    height={chartHeight - topPadding}
                    fill="transparent"
                    onMouseEnter={(e) => !isDragging && handleMouseEnter(i, e)}
                    onMouseMove={(e) => handleTooltipMouseMove(i, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => { e.stopPropagation(); handlePointTap(i, e.clientX, e.clientY); }}
                    onTouchStart={(e) => handleTouchStart(e, i)}
                    onTouchEnd={(e) => handleTouchEnd(e, i)}
                    onPointerUp={(e) => handlePointerUp(i, e)}
                    style={{ cursor: 'pointer' }}
                  />
                  {myY !== null && (
                    <circle
                      cx={x}
                      cy={myY}
                      r={6}
                      fill={COLORS.myScore}
                      stroke="white"
                      strokeWidth={2}
                      onMouseEnter={(e) => !isDragging && handleMouseEnter(i, e)}
                      onMouseMove={(e) => handleTooltipMouseMove(i, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => { e.stopPropagation(); handlePointTap(i, e.clientX, e.clientY); }}
                      onTouchStart={(e) => handleTouchStart(e, i)}
                      onTouchEnd={(e) => handleTouchEnd(e, i)}
                      onPointerUp={(e) => handlePointerUp(i, e)}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  {avgY !== null && (
                    <circle
                      cx={x}
                      cy={avgY}
                      r={5}
                      fill={COLORS.average}
                      stroke="white"
                      strokeWidth={2}
                      onMouseEnter={(e) => !isDragging && handleMouseEnter(i, e)}
                      onMouseMove={(e) => handleTooltipMouseMove(i, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => { e.stopPropagation(); handlePointTap(i, e.clientX, e.clientY); }}
                      onTouchStart={(e) => handleTouchStart(e, i)}
                      onTouchEnd={(e) => handleTouchEnd(e, i)}
                      onPointerUp={(e) => handlePointerUp(i, e)}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  {maxY !== null && (
                    <circle
                      cx={x}
                      cy={maxY}
                      r={5}
                      fill={COLORS.maxScore}
                      stroke="white"
                      strokeWidth={2}
                      onMouseEnter={(e) => !isDragging && handleMouseEnter(i, e)}
                      onMouseMove={(e) => handleTooltipMouseMove(i, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => { e.stopPropagation(); handlePointTap(i, e.clientX, e.clientY); }}
                      onTouchStart={(e) => handleTouchStart(e, i)}
                      onTouchEnd={(e) => handleTouchEnd(e, i)}
                      onPointerUp={(e) => handlePointerUp(i, e)}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  <text x={x} y={chartHeight + 25} textAnchor="middle" fontSize={11} fill="#94a3b8" fontWeight={600}>
                    {shortDate[0]}
                  </text>
                  <text x={x} y={chartHeight + 42} textAnchor="middle" fontSize={10} fill="#cbd5e1" fontWeight={400}>
                    {shortDate[1] ?? ''}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
