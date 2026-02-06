import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { StudentClassProvider, useStudentClass } from '../contexts/StudentClassContext';
import ScrollToTop from '../components/ScrollToTop';
import ClassSelect from '../pages/ClassSelect';

const NAV_ITEMS = [
  { to: '/student/dashboard', label: '홈', icon: HomeIcon },
  { to: '/student/lessons', label: '진도/과제', icon: BookIcon },
  { to: '/student/tests', label: '테스트', icon: ChartIcon },
  { to: '/student/statistics', label: '월별통계', icon: CalendarStatsIcon },
  { to: '/student/profile', label: '내정보', icon: UserIcon },
] as const;

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function BookIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function CalendarStatsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function UserIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

const ACTIVE_COLOR = '#2563EB'; // blue-600

function StudentLayoutContent() {
  const { name, role, logout } = useAuth();
  const location = useLocation();
  const { selectedClassName, isLoading, needsClassSelection, classes, setShowClassSelect } = useStudentClass();
  const title = role === 'parent' ? '학부모' : '학생';
  const hasMultipleClasses = classes.length >= 2;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm font-medium">로딩 중...</p>
      </div>
    );
  }

  if (needsClassSelection) {
    return <ClassSelect />;
  }

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex bg-slate-50">
        {/* PC: 좌측 고정 사이드바 */}
        <aside className="hidden lg:flex w-56 bg-slate-800 text-white flex-col shrink-0 fixed left-0 top-0 bottom-0 z-30">
          <div className="p-4 border-b border-slate-700">
            <Link to="/student/dashboard" className="block mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded" aria-label="홈으로 이동">
              <img
                src="/images/더브레인코어 로고2.png"
                alt="더브레인코어 학원"
                className="h-6 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-slate-400 text-sm mt-2">{title}</p>
          </div>
          <nav className="p-2 flex-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  location.pathname === to ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Icon active={location.pathname === to} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* 콘텐츠 영역: 모바일 max-w-lg 중앙, PC는 pl-56 */}
        <div className="flex-1 flex flex-col min-w-0 w-full max-w-lg mx-auto lg:max-w-none lg:mx-0 lg:pl-56 relative pb-20 lg:pb-0">
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              {/* 반명(클릭 시 홈, 다반 소속 시 반 변경) */}
              {hasMultipleClasses ? (
                <button
                  type="button"
                  onClick={() => setShowClassSelect(true)}
                  className="font-title font-bold text-slate-800 text-base lg:text-lg truncate min-w-0 max-w-[60vw] lg:max-w-[280px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded hover:text-blue-600"
                  title="반 변경"
                >
                  {selectedClassName ?? '-'} ▼
                </button>
              ) : (
                <Link
                  to="/student/dashboard"
                  className="font-title font-bold text-slate-800 text-base lg:text-lg truncate min-w-0 max-w-[60vw] lg:max-w-[280px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                  aria-label="홈으로 이동"
                >
                  {selectedClassName ?? '-'}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 truncate max-w-[120px] lg:max-w-[200px]">
                {name ? (role === 'parent' ? `${name} 부모님` : `${name} 학생`) : '-'}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="로그아웃"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl mx-auto"
            >
              <Outlet />
            </motion.div>
          </main>

          {/* 하단 탭: 모바일만 */}
          <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto h-16 bg-white border-t border-slate-200 flex items-center justify-around z-20 lg:hidden">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors"
                  style={{ color: active ? ACTIVE_COLOR : '#64748b' }}
                >
                  <Icon active={active} />
                  <span className="text-xs mt-0.5 font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}

export default function StudentLayout() {
  return (
    <StudentClassProvider>
      <StudentLayoutContent />
    </StudentClassProvider>
  );
}
