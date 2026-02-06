import { useState, useRef, useEffect } from 'react';

interface ExcelDropdownProps {
  onDownloadTemplate: () => void;
  onBulkUpload: () => void;
  onExport: (mode: 'all' | 'filtered' | 'selected') => void;
  hasSelection: boolean;
  hasFilter: boolean;
  /** 엑셀 내보내기 선택 시 라벨 (기본: "선택한 학생만 다운로드") */
  selectionLabel?: string;
}

export default function ExcelDropdown({
  onDownloadTemplate,
  onBulkUpload,
  onExport,
  hasSelection,
  hasFilter,
  selectionLabel = '선택한 학생만 다운로드',
}: ExcelDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-semibold bg-white hover:bg-slate-50"
      >
        엑셀 관리
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[180px]">
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => { onDownloadTemplate(); setOpen(false); }}
          >
            양식 다운로드
          </button>
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => { onBulkUpload(); setOpen(false); }}
          >
            일괄 등록
          </button>
          <div className="border-t border-slate-100 my-1" />
          <div className="px-3 py-1.5 text-xs text-slate-500">엑셀 내보내기</div>
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => { onExport('all'); setOpen(false); }}
          >
            전체 다운로드
          </button>
          {hasFilter && (
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => { onExport('filtered'); setOpen(false); }}
            >
              검색/필터 결과 다운로드
            </button>
          )}
          {hasSelection && (
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => { onExport('selected'); setOpen(false); }}
            >
              {selectionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
