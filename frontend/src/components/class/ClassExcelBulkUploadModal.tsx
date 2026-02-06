import { useState, useRef } from 'react';
import ClassExcelPreviewTable, { type ClassPreviewRow } from './ClassExcelPreviewTable';
import type { ClassExcelRow } from '../../types/class';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === ',' || c === '\t') && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  result.push(cur.trim());
  return result;
}

function validateRow(row: ClassExcelRow, _index: number): string[] {
  const err: string[] = [];
  if (!row.name?.trim()) err.push('반 이름 누락');
  return err;
}

interface ClassExcelBulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  onRegister: (rows: ClassExcelRow[]) => Promise<{ success: number; fail: number }>;
}

export default function ClassExcelBulkUploadModal({
  open,
  onClose,
  onComplete,
  onRegister,
}: ClassExcelBulkUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [previewRows, setPreviewRows] = useState<ClassPreviewRow[]>([]);
  const [result, setResult] = useState<{ success: number; fail: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const rows: ClassPreviewRow[] = [];
      const header = (lines[0] ?? '').toLowerCase();
      const hasHeader = header.includes('반 이름') || header.includes('반이름') || header.includes('name');
      const start = hasHeader ? 1 : 0;
      for (let i = start; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        const row: ClassExcelRow = {
          name: cells[0] ?? '',
          description: cells[1] ?? '',
        };
        const errors = validateRow(row, i);
        rows.push({ ...row, _rowIndex: i, errors: errors.length ? errors : undefined });
      }
      setPreviewRows(rows);
      setStep(2);
      setResult(null);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const validRows = previewRows
    .filter((r) => !r.errors?.length)
    .map(({ _rowIndex: _, errors: __, ...v }) => v);

  const handleRegisterValid = async () => {
    if (validRows.length === 0) return;
    setLoading(true);
    try {
      const res = await onRegister(validRows);
      setResult(res);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setPreviewRows([]);
    setResult(null);
    onClose();
  };

  const handleDone = () => {
    onComplete();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={handleClose}>
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-950">엑셀 일괄 등록 (반)</h2>
          <p className="text-sm text-slate-500 mt-1">
            {step === 1 && '파일을 선택하세요. (CSV, 컬럼: 반 이름, 비고)'}
            {step === 2 && '미리보기 및 검증 결과. 유효한 행만 등록할 수 있습니다.'}
            {step === 3 && '등록이 완료되었습니다.'}
          </p>
        </div>
        <div className="p-6 overflow-auto flex-1">
          {step === 1 && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-950 text-white rounded-lg font-medium hover:bg-slate-800"
              >
                파일 선택
              </button>
              <p className="text-sm text-slate-500 mt-2">CSV (반 이름, 비고)</p>
            </div>
          )}
          {step === 2 && (
            <>
              <ClassExcelPreviewTable rows={previewRows} />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={handleClose} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700">
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleRegisterValid}
                  disabled={validRows.length === 0 || loading}
                  className="px-4 py-2 bg-slate-950 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? '등록 중...' : `유효한 데이터만 등록 (${validRows.length}건)`}
                </button>
              </div>
            </>
          )}
          {step === 3 && result !== null && (
            <div className="text-center py-4">
              <p className="text-slate-800 font-medium">등록 완료</p>
              <p className="text-sm text-slate-600 mt-2">성공 {result.success}건, 실패 {result.fail}건</p>
              <button
                type="button"
                onClick={handleDone}
                className="mt-6 px-4 py-2 bg-slate-950 text-white rounded-lg font-medium"
              >
                확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
