import type { ClassExcelRow } from '../../types/class';

export interface ClassPreviewRow extends ClassExcelRow {
  _rowIndex: number;
  errors?: string[];
}

interface ClassExcelPreviewTableProps {
  rows: ClassPreviewRow[];
}

export default function ClassExcelPreviewTable({ rows }: ClassExcelPreviewTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto max-h-[320px] overflow-y-auto border border-slate-200 rounded-lg">
      <table className="w-full text-left border-collapse text-[13px]">
        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
          <tr className="text-slate-600 font-semibold">
            <th className="p-2 w-8">#</th>
            <th className="p-2">반 이름</th>
            <th className="p-2">비고</th>
            <th className="p-2 text-red-600">오류</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={row._rowIndex}
              className={row.errors?.length ? 'bg-red-50' : ''}
            >
              <td className="p-2 text-slate-500">{row._rowIndex + 1}</td>
              <td className="p-2">{row.name}</td>
              <td className="p-2">{row.description ?? '-'}</td>
              <td className="p-2 text-red-600 text-xs">
                {row.errors?.length ? row.errors.join(', ') : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
