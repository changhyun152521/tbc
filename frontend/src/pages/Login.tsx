import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserIcon, LockIcon, LogInIcon, SearchIcon, XIcon } from '../components/ui/Icons';
import { useAuth } from '../contexts/AuthContext';
import ScrollToTop from '../components/ScrollToTop';
import { apiClient } from '../api/client';

const LOGO_SRC = '/images/' + encodeURIComponent('더브레인코어 로고1.png');

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, role, isAuthenticated, isReady } = useAuth();

  const [findIdOpen, setFindIdOpen] = useState(false);
  const [findIdType, setFindIdType] = useState<'student' | 'parent'>('student');
  const [findIdName, setFindIdName] = useState('');
  const [findIdPhone, setFindIdPhone] = useState('');
  const [findIdResult, setFindIdResult] = useState<string | null>(null);
  const [findIdError, setFindIdError] = useState('');
  const [findIdLoading, setFindIdLoading] = useState(false);

  const openFindIdModal = () => {
    setFindIdOpen(true);
    setFindIdName('');
    setFindIdPhone('');
    setFindIdResult(null);
    setFindIdError('');
  };

  const closeFindIdModal = () => setFindIdOpen(false);

  const handleFindId = async (e: FormEvent) => {
    e.preventDefault();
    setFindIdError('');
    setFindIdResult(null);
    if (!findIdName.trim() || !findIdPhone.trim()) {
      setFindIdError(findIdType === 'student' ? '이름과 학생 전화번호를 입력해 주세요.' : '학생명과 학부모 전화번호를 입력해 주세요.');
      return;
    }
    setFindIdLoading(true);
    try {
      const res = await apiClient.post<{ success: boolean; data?: { loginId: string }; message?: string }>(
        '/auth/find-login-id',
        { type: findIdType, name: findIdName.trim(), phone: findIdPhone.trim() }
      );
      if (res.data.success && res.data.data?.loginId) {
        setFindIdResult(res.data.data.loginId);
      } else {
        setFindIdError(res.data.message ?? '일치하는 정보가 없습니다.');
      }
    } catch (err: unknown) {
      const msg =
        typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : '아이디 찾기에 실패했습니다.';
      setFindIdError(msg);
      setFindIdResult(null);
    } finally {
      setFindIdLoading(false);
    }
  };

  const canSubmit = loginId.trim() !== '' && password.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    setLoading(true);
    try {
      await login(loginId.trim(), password, remember);
    } catch (err) {
      setError(err instanceof Error ? err.message : '아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans text-slate-950">
        <p className="text-slate-500 text-[14px] font-medium">로딩 중...</p>
      </div>
    );
  }

  if (isAuthenticated && role) {
    if (role === 'admin' || role === 'teacher') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors pl-11 min-h-[42px]';

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col items-center pt-10 sm:pt-12 px-6 pb-12 font-sans text-slate-950 bg-slate-50">
        {/* 헤더: 로고 + 제목 (메인페이지 StudentDashboard와 동일 스타일) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center select-none mb-5 sm:mb-6 pt-6"
        >
          <div className="relative mb-4">
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 sm:w-20 sm:h-2.5 bg-slate-300/40 rounded-full blur-md"
              aria-hidden
            />
            <img
              src={LOGO_SRC}
              alt="THE BRAIN CORE"
              className="relative h-20 sm:h-24 w-auto object-contain"
              style={{
                filter: 'drop-shadow(0 12px 14px rgba(15, 23, 42, 0.18)) contrast(1.05)',
              }}
            />
          </div>
          <div className="flex flex-col items-center w-full max-w-[200px] sm:max-w-[220px]">
            <h1 className="font-title font-bold text-[23px] sm:text-[25px] tracking-[0.02em] text-slate-700">
              더브레인코어
            </h1>
            <p className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-[0.18em] sm:tracking-[0.25em] leading-none whitespace-nowrap">
              학습 관리 시스템
            </p>
            <div className="w-8 h-[2px] bg-slate-200 mt-5 rounded-full" aria-hidden />
          </div>
        </motion.div>

        <div className="w-full max-w-[320px] sm:max-w-[360px]">
          {/* 로그인 카드 (모바일 320px→콘텐츠 270px, sm 이상 360px) */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="w-full bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm"
          >
            <h2 className="text-[17px] font-bold text-slate-800 flex items-center gap-2 mb-6">
              <LogInIcon size={18} className="text-slate-500" stroke="rgb(30 64 175)" />
              로그인
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <UserIcon
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={18}
                  stroke="rgb(30 64 175)"
                  strokeWidth={2}
                />
                <input
                  id="loginId"
                  type="text"
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className={inputClass}
                  placeholder="아이디"
                />
              </div>

              <div className="relative">
                <LockIcon
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={18}
                  stroke="rgb(30 64 175)"
                  strokeWidth={2}
                />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="비밀번호"
                />
              </div>

              {error && (
                <div
                  className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-[14px] hover:bg-blue-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer text-[13px] text-slate-600 font-medium hover:text-slate-800 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4"
                />
                로그인 유지
              </label>
              <button
                type="button"
                className="text-[13px] text-slate-500 font-medium hover:text-slate-800 transition-colors"
                onClick={openFindIdModal}
              >
                아이디 찾기
              </button>
            </div>
          </motion.section>
        </div>

        {/* 아이디 찾기 모달 */}
        {findIdOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={closeFindIdModal}
          >
            <div
              className="w-full max-w-[340px] bg-white rounded-[20px] p-6 shadow-xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[17px] font-bold text-slate-800 flex items-center gap-2">
                  <SearchIcon size={18} className="text-slate-500" stroke="rgb(30 64 175)" />
                  아이디 찾기
                </h3>
                <button
                  type="button"
                  onClick={closeFindIdModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  aria-label="닫기"
                >
                  <XIcon size={20} />
                </button>
              </div>

              <div className="flex gap-3 mb-5">
                <label
                  className={`flex-1 flex items-center justify-center py-2.5 rounded-xl border cursor-pointer transition-colors select-none ${
                    findIdType === 'student' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="findIdType"
                    checked={findIdType === 'student'}
                    onChange={() => {
                      setFindIdType('student');
                      setFindIdResult(null);
                      setFindIdError('');
                    }}
                    className="sr-only"
                  />
                  <span className={`text-[14px] font-medium ${findIdType === 'student' ? 'text-blue-600' : 'text-slate-500'}`}>
                    학생
                  </span>
                </label>
                <label
                  className={`flex-1 flex items-center justify-center py-2.5 rounded-xl border cursor-pointer transition-colors select-none ${
                    findIdType === 'parent' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="findIdType"
                    checked={findIdType === 'parent'}
                    onChange={() => {
                      setFindIdType('parent');
                      setFindIdResult(null);
                      setFindIdError('');
                    }}
                    className="sr-only"
                  />
                  <span className={`text-[14px] font-medium ${findIdType === 'parent' ? 'text-blue-600' : 'text-slate-500'}`}>
                    학부모
                  </span>
                </label>
              </div>

              <form onSubmit={handleFindId} className="space-y-4">
                <div>
                  <label htmlFor="findIdName" className="block text-[13px] font-medium text-slate-600 mb-1.5">
                    {findIdType === 'student' ? '이름' : '학생명'}
                  </label>
                  <input
                    id="findIdName"
                    type="text"
                    value={findIdName}
                    onChange={(e) => setFindIdName(e.target.value)}
                    placeholder={findIdType === 'student' ? '학생 이름 입력' : '학생 이름 입력'}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[14px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="findIdPhone" className="block text-[13px] font-medium text-slate-600 mb-1.5">
                    {findIdType === 'student' ? '학생 전화번호' : '학부모 전화번호'}
                  </label>
                  <input
                    id="findIdPhone"
                    type="tel"
                    value={findIdPhone}
                    onChange={(e) => setFindIdPhone(e.target.value)}
                    placeholder="숫자만 입력"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[14px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>

                {findIdError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-[13px] font-medium">
                    {findIdError}
                  </div>
                )}
                {findIdResult && (
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-[14px] font-semibold">
                    아이디: {findIdResult}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={findIdLoading}
                  className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-[14px] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {findIdLoading ? '조회 중...' : '아이디 찾기'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
