/**
 * API 기본 URL (백엔드 서버)
 * 개발: Vite proxy 사용 시 상대 경로 /api, 배포 시 실제 도메인으로 변경
 */
export const apiBaseUrl =
  typeof import.meta.env.VITE_API_BASE_URL === 'string' && import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : '';
