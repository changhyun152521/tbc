interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const VISIBLE_PAGE_COUNT = 5;

/** 화면에는 최대 5개 페이지 번호만 표시 (슬라이딩 윈도우) */
function buildVisiblePages(currentPage: number, totalPages: number): number[] {
  if (totalPages <= VISIBLE_PAGE_COUNT) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  let start = currentPage - Math.floor(VISIBLE_PAGE_COUNT / 2);
  let end = start + VISIBLE_PAGE_COUNT - 1;

  if (start < 1) {
    start = 1;
    end = VISIBLE_PAGE_COUNT;
  }
  if (end > totalPages) {
    end = totalPages;
    start = totalPages - VISIBLE_PAGE_COUNT + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;
  const pages = buildVisiblePages(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={prevDisabled}
        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
      >
        이전
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`min-w-[2.25rem] py-1.5 text-sm font-medium rounded-lg ${
            page === currentPage
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={nextDisabled}
        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
      >
        다음
      </button>
    </div>
  );
}
