import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudentClass } from '../contexts/StudentClassContext';

function BookOpenIcon({ className, stroke, strokeWidth, style }: { className?: string; stroke?: string; strokeWidth?: number; style?: React.CSSProperties }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke ?? 'currentColor'} strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export default function ClassSelect() {
  const { classes, setSelectedClassId, setShowClassSelect } = useStudentClass();
  const navigate = useNavigate();

  const handleSelect = (classId: string) => {
    setSelectedClassId(classId);
    setShowClassSelect(false);
    navigate('/student/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-10 sm:pt-12 px-6 pb-12 font-sans text-slate-950 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="relative mb-4">
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 sm:w-20 sm:h-2.5 bg-slate-300/40 rounded-full blur-md"
            aria-hidden
          />
          <BookOpenIcon
            className="h-16 w-16 sm:h-20 sm:w-20 text-slate-500"
            stroke="rgb(30 64 175)"
            strokeWidth={1.8}
            style={{ filter: 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.2))' }}
          />
        </div>
        <h1 className="font-title font-bold text-[23px] sm:text-[25px] tracking-[0.02em] text-slate-700">
          반 선택
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">로그인할 반을 선택해 주세요.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-[320px] sm:max-w-[360px] space-y-3"
      >
        {classes.map((c) => (
          <button
            key={c._id}
            type="button"
            onClick={() => handleSelect(c._id)}
            className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[20px] shadow-sm hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left"
          >
            <span className="text-[16px] font-bold text-slate-800">{c.name}</span>
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </motion.div>
    </div>
  );
}
