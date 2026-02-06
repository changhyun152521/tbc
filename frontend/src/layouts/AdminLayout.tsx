import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import ScrollToTop from '../components/ScrollToTop';

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: '대시보드' },
  { to: '/admin/students', label: '학생 관리' },
  { to: '/admin/teachers', label: '강사 관리' },
  { to: '/admin/classes', label: '반 관리' },
  { to: '/admin/lessons', label: '수업 관리' },
  { to: '/admin/tests', label: '시험 관리' },
] as const;

function getPageTitle(pathname: string): string {
  if (pathname.includes('/admin/students')) return '학생 관리';
  if (pathname.includes('/admin/teachers')) return '강사 관리';
  if (pathname.includes('/admin/classes')) return '반 관리';
  if (pathname.includes('/admin/lessons')) return '수업 관리';
  if (pathname.includes('/admin/tests')) return '시험 관리';
  return '대시보드';
}

export default function AdminLayout() {
  const { name, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex bg-transparent">
      {/* 데스크탑: 좌측 고정 사이드바 */}
      <aside className="hidden lg:flex w-56 bg-slate-800 text-white flex-col shrink-0 fixed left-0 top-0 bottom-0 z-30">
        <div className="p-4 border-b border-slate-700">
          <Link to="/admin/dashboard" className="block mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded" aria-label="홈으로 이동">
            <img
              src="/images/더브레인코어 로고2.png"
              alt="더브레인코어 학원"
              className="h-6 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <p className="text-slate-400 text-sm mt-2">관리자</p>
        </div>
        <nav className="p-2 flex-1">
          {ADMIN_NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname === to ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-200'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* 모바일: 드로어 오버레이 */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-slate-800 text-white z-50 lg:hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="min-w-0">
                  <Link to="/admin/dashboard" onClick={() => setDrawerOpen(false)} className="block mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded" aria-label="홈으로 이동">
                    <img
                      src="/images/더브레인코어 로고2.png"
                      alt="더브레인코어 학원"
                      className="h-6 w-auto object-contain brightness-0 invert"
                    />
                  </Link>
                  <p className="text-slate-400 text-sm mt-2">관리자</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-200"
                  aria-label="메뉴 닫기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="p-2 flex-1">
                {ADMIN_NAV.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setDrawerOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm ${
                      location.pathname === to ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 lg:pl-56">
        {/* 상단 헤더: 모바일에는 햄버거 + 제목 + 로그아웃 */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="메뉴 열기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-slate-700 font-medium">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-slate-700 font-medium truncate max-w-[120px] sm:max-w-none">{name ?? '-'}</span>
            <button
              type="button"
              onClick={() => logout()}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="로그아웃"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* 메인 콘텐츠 + 페이드 */}
        <main className="flex-1 p-0 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="p-0"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
    </>
  );
}
