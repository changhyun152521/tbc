/** Asia/Seoul 기준 YYYY-MM-DD */
export function kstToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

/** 공지 '앞으로 계속 보지 않기'용 — hideUntil이 이 값이면 기간 내 영구 숨김 */
export const ANNOUNCEMENT_HIDE_FOREVER = '9999-12-31';

export function kstAddDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isYyyyMmDd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
