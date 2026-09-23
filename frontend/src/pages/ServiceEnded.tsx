import { useEffect } from 'react';
import { motion } from 'framer-motion';
import ScrollToTop from '../components/ScrollToTop';

const LOGO_SRC = '/images/' + encodeURIComponent('더브레인코어 로고1.png');
const NEW_SERVICE_URL = 'https://www.tbcclass.com';

const STORAGE_KEYS = [
  'tbc_token',
  'tbc_role',
  'tbc_name',
  'tbc_remember',
  'tbc_must_change',
  'tbc_preview_backup',
  'tbc_selected_class_id',
  'tbc_student_popups_shown',
  'tbc_student_popups_shown_preview',
  'tbc_teacher_popups_shown',
];

function clearClientData() {
  STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function ExternalLinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export default function ServiceEnded() {
  useEffect(() => {
    clearClientData();
  }, []);

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col items-center pt-10 sm:pt-12 px-6 pb-12 font-sans text-slate-950 bg-slate-50">
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
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="w-full bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm text-center"
          >
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-600 mb-4">
              서비스 종료
            </span>
            <h2 className="text-[18px] font-bold text-slate-800 mb-3">
              기존 학습관리 서비스가
              <br />
              종료되었습니다
            </h2>
            <p className="text-[14px] leading-relaxed text-slate-600">
              서버가 종료되었고 기존 데이터는 모두 삭제되었습니다.
              <br />
              새로운 서비스는 아래 주소에서 이용해 주세요.
            </p>

            <a
              href={NEW_SERVICE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-[14px] hover:bg-blue-700 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              새 서비스로 이동
              <ExternalLinkIcon />
            </a>

            <p className="mt-4 text-[13px] text-slate-500 break-all">
              <a
                href={NEW_SERVICE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                www.tbcclass.com
              </a>
            </p>
          </motion.section>
        </div>

        <footer className="mt-auto pt-10 pb-6 text-center">
          <p className="text-[12px] text-slate-400 font-normal">
            © 2026 TBC-CLASS. All rights reserved.
          </p>
          <p className="text-[12px] text-slate-500 font-normal mt-1">
            Developed by 이창현수학
          </p>
        </footer>
      </div>
    </>
  );
}
