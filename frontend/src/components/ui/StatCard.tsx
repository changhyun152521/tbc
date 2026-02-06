import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon?: ReactNode;
}

/**
 * 대시보드용 통계 카드.
 * 상단: Icon + Label, 하단: Inter 폰트로 큰 숫자 + 선택적 trend.
 */
export default function StatCard({ label, value, trend, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-slate-400">{icon}</span>}
        <p className="text-slate-500 text-sm font-semibold">{label}</p>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl sm:text-3xl font-bold font-number text-slate-900">{value}</span>
        {trend !== undefined && (
          <span className="text-emerald-500 text-xs font-bold mb-1.5">{trend}</span>
        )}
      </div>
    </div>
  );
}
