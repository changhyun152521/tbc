import { useState, useEffect } from 'react';
import { UserIcon } from '../components/ui/Icons';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface MeProfile {
  id: string;
  role: string;
  name: string;
  loginId: string;
  phone: string;
  mustChangePassword?: boolean;
  isAdminAccess?: boolean;
}

export default function StudentProfile() {
  const { setMustChangePassword } = useAuth();
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
          setMustChangePassword(res.data.data.mustChangePassword === true);
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
  }, [setMustChangePassword]);

  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loginIdMsg, setLoginIdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [phoneMsg, setPhoneMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [setupMsg, setSetupMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLoginId, setNewLoginId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [setupCurrentPassword, setSetupCurrentPassword] = useState('');
  const [setupNewPassword, setSetupNewPassword] = useState('');
  const [setupNewLoginId, setSetupNewLoginId] = useState('');
  const [setupSubmitting, setSetupSubmitting] = useState(false);

  const mustChange = profile?.mustChangePassword === true && !profile?.isAdminAccess;

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupMsg(null);
    if (!setupNewLoginId.trim() || !setupCurrentPassword || !setupNewPassword.trim()) {
      setSetupMsg({ type: 'err', text: '새 아이디, 현재 비밀번호, 새 비밀번호를 모두 입력해 주세요.' });
      return;
    }
    setSetupSubmitting(true);
    try {
      const res = await apiClient.put<{ success: boolean; message?: string; data?: { loginId?: string } }>(
        '/me/initial-credentials',
        {
          currentPassword: setupCurrentPassword,
          newPassword: setupNewPassword.trim(),
          newLoginId: setupNewLoginId.trim(),
        }
      );
      if (res.data.success) {
        setSetupMsg({ type: 'ok', text: '아이디와 비밀번호가 변경되었습니다. 이제 서비스를 이용할 수 있습니다.' });
        setMustChangePassword(false);
        setSetupCurrentPassword('');
        setSetupNewPassword('');
        setSetupNewLoginId('');
        if (profile) {
          setProfile({
            ...profile,
            loginId: res.data.data?.loginId ?? setupNewLoginId.trim(),
            mustChangePassword: false,
          });
        }
      } else {
        setSetupMsg({ type: 'err', text: res.data.message ?? '변경에 실패했습니다.' });
      }
    } catch (err: unknown) {
      const msg =
        typeof (err as { response?: { data?: { message?: string } } })?.response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : '계정 설정에 실패했습니다.';
      setSetupMsg({ type: 'err', text: msg });
    } finally {
      setSetupSubmitting(false);
    }
  };

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

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors';
  const btnClass =
    'px-5 py-2.5 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

  const header = (
    <div className="flex flex-col items-center select-none mb-8 sm:mb-10 pt-2">
      <div className="relative mb-4">
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-slate-300/40 rounded-full blur-md"
          aria-hidden
        />
        <UserIcon
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
  );

  if (loading) {
    return (
      <div className="flex flex-col pt-2 sm:pt-4 px-4 sm:px-6 pb-20 lg:pb-8 font-sans text-slate-950 bg-slate-50">
        {header}
        <div className="max-w-lg mx-auto w-full py-16 text-center text-slate-500 text-sm font-medium">
          로딩 중...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col pt-2 sm:pt-4 px-4 sm:px-6 pb-20 lg:pb-8 font-sans text-slate-950 bg-slate-50">
        {header}
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

  return (
    <div className="flex flex-col pt-2 sm:pt-4 px-4 sm:px-6 pb-20 lg:pb-8 font-sans text-slate-950 bg-slate-50">
      {header}

      <div className="max-w-lg mx-auto w-full space-y-6">
        {mustChange && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-sm" role="alert">
            <p className="font-semibold">아이디·비밀번호 변경이 필요합니다</p>
            <p className="mt-1 text-amber-800">
              보안을 위해 로그인 아이디와 비밀번호를 함께 변경해 주세요. 변경 완료 전까지 다른 메뉴를 이용할 수 없습니다.
            </p>
          </div>
        )}

        <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <h2 className="text-[17px] font-bold text-slate-800 flex items-center gap-2 mb-5">
            <UserIcon size={18} className="text-slate-500" stroke="rgb(30 64 175)" />
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
            {!mustChange && (
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 sm:col-span-2">
                <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">전화번호</dt>
                <dd className="text-[15px] font-semibold text-slate-800 mt-1">{profile.phone || '-'}</dd>
              </div>
            )}
          </dl>
        </section>

        {mustChange ? (
          <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
            <h2 className="text-[17px] font-bold text-slate-800 mb-5">아이디·비밀번호 설정</h2>
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="새 로그인 아이디"
                value={setupNewLoginId}
                onChange={(e) => setSetupNewLoginId(e.target.value)}
                className={inputClass}
                autoComplete="username"
              />
              <input
                type="password"
                placeholder="현재 비밀번호 (초기: 전화번호)"
                value={setupCurrentPassword}
                onChange={(e) => setSetupCurrentPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
              />
              <input
                type="password"
                placeholder="새 비밀번호"
                value={setupNewPassword}
                onChange={(e) => setSetupNewPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
              <button type="submit" className={btnClass} disabled={setupSubmitting}>
                {setupSubmitting ? '저장 중...' : '아이디·비밀번호 변경 완료'}
              </button>
              {setupMsg && (
                <p
                  className={
                    setupMsg.type === 'ok'
                      ? 'text-emerald-600 text-[13px] font-medium'
                      : 'text-red-600 text-[13px] font-medium'
                  }
                >
                  {setupMsg.text}
                </p>
              )}
            </form>
          </section>
        ) : (
          <>
            <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
              <h2 className="text-[17px] font-bold text-slate-800 mb-5">비밀번호 변경</h2>
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

            <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
              <h2 className="text-[17px] font-bold text-slate-800 mb-5">로그인 ID 변경</h2>
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

            <section className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
              <h2 className="text-[17px] font-bold text-slate-800 mb-5">전화번호 변경</h2>
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
          </>
        )}
      </div>
    </div>
  );
}
