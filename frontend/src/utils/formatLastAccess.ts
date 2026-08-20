const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const OLD_THRESHOLD_MS = 4 * WEEK_MS;

function formatDateOnly(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** 관리자 전용 최근 접속 표시: N분/시간/일/주 전, 오래되면 날짜만 */
export function formatLastAccess(value?: string | Date | null): string {
  if (!value) return '접속 기록 없음';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '접속 기록 없음';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatDateOnly(date);

  if (diffMs < MINUTE_MS) return '방금 전';
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}분 전`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}시간 전`;
  if (diffMs < WEEK_MS) return `${Math.floor(diffMs / DAY_MS)}일 전`;
  if (diffMs < OLD_THRESHOLD_MS) return `${Math.floor(diffMs / WEEK_MS)}주 전`;

  return formatDateOnly(date);
}
