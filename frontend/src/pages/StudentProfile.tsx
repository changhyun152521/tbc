import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { apiClient } from '../api/client';

interface MeProfile {
  id: string;
  role: string;
  name: string;
  loginId: string;
  phone: string;
}

export default function StudentProfile() {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiClient
      .get<{ success: boolean; data: MeProfile }>('/me')
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.data) {
          setProfile(res.data.data);
        } else {
          setProfile(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('내 정보를 불러올 수 없습니다.');
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loginIdMsg, setLoginIdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [phoneMsg, setPhoneMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLoginId, setNewLoginId] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!currentPassword.trim() || !newPassword.trim()) {
      setPasswordMsg({ type: 'err', text: '현재 비밀번호와 새 비밀번호를 입력해 주세요.' });
      return;
    }
    try {
      const res = await apiClient.put<{ success: boolean; message?: string }>('/me/password', {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      if (res.data.success) {
        setPasswordMsg({ type: 'ok', text: '비밀번호가 변경되었습니다.' });
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPasswordMsg({ type: 'err', text: res.data.message ?? '변경에 실패했습니다.' });
      }
    } catch (err: unknown) {
      const msg =
        typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : '비밀번호 변경에 실패했습니다.';
      setPasswordMsg({ type: 'err', text: msg });
    }
  };

  const handleLoginIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginIdMsg(null);
    if (!newLoginId.trim()) {
      setLoginIdMsg({ type: 'err', text: '새 로그인 ID를 입력해 주세요.' });
      return;
    }
    try {
      const res = await apiClient.put<{ success: boolean; message?: string }>('/me/loginId', {
        newLoginId: newLoginId.trim(),
      });
      if (res.data.success) {
        setLoginIdMsg({ type: 'ok', text: '로그인 ID가 변경되었습니다.' });
        setNewLoginId('');
        if (profile) setProfile({ ...profile, loginId: newLoginId.trim() });
      } else {
        setLoginIdMsg({ type: 'err', text: res.data.message ?? '변경에 실패했습니다.' });
      }
    } catch (err: unknown) {
      const msg =
        typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : '로그인 ID 변경에 실패했습니다.';
      setLoginIdMsg({ type: 'err', text: msg });
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneMsg(null);
    if (!newPhone.trim()) {
      setPhoneMsg({ type: 'err', text: '새 전화번호를 입력해 주세요.' });
      return;
    }
    try {
      const res = await apiClient.put<{ success: boolean; message?: string }>('/me/phone', {
        newPhone: newPhone.trim(),
      });
      if (res.data.success) {
        setPhoneMsg({ type: 'ok', text: '전화번호가 변경되었습니다.' });
        setNewPhone('');
        if (profile) setProfile({ ...profile, phone: newPhone.trim() });
      } else {
        setPhoneMsg({ type: 'err', text: res.data.message ?? '변경에 실패했습니다.' });
      }
    } catch (err: unknown) {
      const msg =
        typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : '전화번호 변경에 실패했습니다.';
      setPhoneMsg({ type: 'err', text: msg });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col pt-2 sm:pt-4 px-4 sm:px-6 pb-20 lg:pb-8 font-sans text-slate-950 bg-slate-50">
        <div className="flex flex-col items-center select-none mb-8 sm:mb-10 pt-2">
          <div className="relative mb-4">
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-slate-300/40 rounded-full blur-md"
              aria-hidden
            />
            <User
              className="h-14 w-14 sm:h-16 sm:w-16 relative"
              strokeWidth={1.8}
              stroke="rgb(30 64 175)"
              style={{ filter: 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.2))' }}
            />
          </div>
          <div className="flex flex-col items-center w-full max-w-[220px] sm:max-w-[260px]">
            <h1 className="font-title font-bold text-[23px] sm:text-[25px] tracking-[0.02em] text-slate-700">
              내정보
            </h1>
            <p className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-[0.18em] sm:tracking-[0.25em] leading-none whitespace-nowrap">
              계정 정보 관리
            </p>
            <div className="w-8 h-[2px] bg-slate-200 mt-5 rounded-full" aria-hidden />
          </div>
        </div>
        <div className="max-w-lg mx-auto w-full py-16 text-center text-slate-500 text-sm font-medium">
          로딩 중...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col pt-2 sm:pt-4 px-4 sm:px-6 pb-20 lg:pb-8 font-sans text-slate-950 bg-slate-50">
        <div className="flex flex-col items-center select-none mb-8 sm:mb-10 pt-2">
          <div className="relative mb-4">
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-slate-300/40 rounded-full blur-md"
              aria-hidden
            />
            <User
              className="h-14 w-14 sm:h-16 sm:w-16 relative"
              strokeWidth={1.8}
              stroke="rgb(30 64 175)"
              style={{ filter: 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.2))' }}
            />
          </div>
          <div className="flex flex-col items-center w-full max-w-[220px] sm:max-w-[260px]">
            <h1 className="font-title font-bold text-[23px] sm:text-[25px] tracking-[0.02em] text-slate-700">
              내정보
            </h1>
            <p className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-[0.18em] sm:tracking-[0.25em] leading-none whitespace-nowrap">
              계정 정보 관리
            </p>
            <div className="w-8 h-[2px] bg-slate-200 mt-5 rounded-full" aria-hidden />
          </div>
        </div>
        <div className="max-w-lg mx-auto w-full">
          <div
            className="p-4 bg-red-50 text-red-700 rounded-[20px] text-sm font-medium border border-red-100"
            role="alert"
          >
            {error || '내 정보를 불러올 수 없습니다.'}
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors';
  const btnClass =
    'px-5 py-2.5 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

  return (
    <div className="flex flex-col pt-2 sm:pt-4 px-4 sm:px-6 pb-20 lg:pb-8 font-sans text-slate-950 bg-slate-50">
      {/* 헤더 */}
      <div className="flex flex-col items-center select-none mb-8 sm:mb-10 pt-2">
        <div className="relative mb-4">
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-slate-300/40 rounded-full blur-md"
            aria-hidden
          />
          <User
            className="h-14 w-14 sm:h-16 sm:w-16 relative"
            strokeWidth={1.8}
            stroke="rgb(30 64 175)"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.2))' }}
          />
        </div>
        <div className="flex flex-col items-center w-full max-w-[220px] sm:max-w-[260px]">
          <h1 className="font-title font-bold text-[23px] sm:text-[25px] tracking-[0.02em] text-slate-700">
            내정보
          </h1>
          <p className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-[0.18em] sm:tracking-[0.25em] leading-none whitespace-nowrap">
            계정 정보 관리
          </p>
          <div className="w-8 h-[2px] bg-slate-200 mt-5 rounded-full" aria-hidden />
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full space-y-6">
        {/* 기본 정보 */}
        <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <h2 className="text-[17px] font-bold text-slate-800 flex items-center gap-2 mb-5">
            <User size={18} className="text-slate-500" stroke="rgb(30 64 175)" />
            기본 정보
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
              <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">이름</dt>
              <dd className="text-[15px] font-semibold text-slate-800 mt-1">{profile.name}</dd>
            </div>
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
              <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">로그인 ID</dt>
              <dd className="text-[15px] font-semibold text-slate-800 mt-1">{profile.loginId}</dd>
            </div>
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 sm:col-span-2">
              <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">전화번호</dt>
              <dd className="text-[15px] font-semibold text-slate-800 mt-1">{profile.phone || '-'}</dd>
            </div>
          </dl>
        </section>

        {/* 비밀번호 변경 */}
        <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <h2 className="text-[17px] font-bold text-slate-800 flex items-center gap-2 mb-5">
            <svg
              className="w-[18px] h-[18px] text-slate-500"
              fill="none"
              stroke="rgb(30 64 175)"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            비밀번호 변경
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="현재 비밀번호"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
            <input
              type="password"
              placeholder="새 비밀번호"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
            <button type="submit" className={btnClass}>
              비밀번호 변경
            </button>
            {passwordMsg && (
              <p
                className={
                  passwordMsg.type === 'ok'
                    ? 'text-emerald-600 text-[13px] font-medium'
                    : 'text-red-600 text-[13px] font-medium'
                }
              >
                {passwordMsg.text}
              </p>
            )}
          </form>
        </section>

        {/* 로그인 ID 변경 */}
        <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <h2 className="text-[17px] font-bold text-slate-800 flex items-center gap-2 mb-5">
            <svg
              className="w-[18px] h-[18px] text-slate-500"
              fill="none"
              stroke="rgb(30 64 175)"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            로그인 ID 변경
          </h2>
          <form onSubmit={handleLoginIdSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="새 로그인 ID"
              value={newLoginId}
              onChange={(e) => setNewLoginId(e.target.value)}
              className={inputClass}
              autoComplete="username"
            />
            <button type="submit" className={btnClass}>
              로그인 ID 변경
            </button>
            {loginIdMsg && (
              <p
                className={
                  loginIdMsg.type === 'ok'
                    ? 'text-emerald-600 text-[13px] font-medium'
                    : 'text-red-600 text-[13px] font-medium'
                }
              >
                {loginIdMsg.text}
              </p>
            )}
          </form>
        </section>

        {/* 전화번호 변경 */}
        <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <h2 className="text-[17px] font-bold text-slate-800 flex items-center gap-2 mb-5">
            <svg
              className="w-[18px] h-[18px] text-slate-500"
              fill="none"
              stroke="rgb(30 64 175)"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            전화번호 변경
          </h2>
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <input
              type="tel"
              placeholder="새 전화번호"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className={inputClass}
            />
            <button type="submit" className={btnClass}>
              전화번호 변경
            </button>
            {phoneMsg && (
              <p
                className={
                  phoneMsg.type === 'ok'
                    ? 'text-emerald-600 text-[13px] font-medium'
                    : 'text-red-600 text-[13px] font-medium'
                }
              >
                {phoneMsg.text}
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
