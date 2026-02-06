import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 라우트(메뉴) 이동 시 페이지를 항상 상단으로 스크롤합니다.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
