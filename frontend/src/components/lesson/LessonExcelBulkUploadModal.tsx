import { useState, useRef } from 'react';
import { apiClient } from '../../api/client';

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

export interface LessonExcelRow {
  date: string;
  className: string;
  period: string;
  teacherName: string;
}

interface LessonExcelBulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  classOptions: { _id: string; name: string }[];
  teacherOptions: { _id: string; name: string }[];
}

export default function LessonExcelBulkUploadModal({
  open,
  onClose,
  onComplete,
  classOptions,
  teacherOptions,
}: LessonExcelBulkUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<LessonExcelRow[]>([]);
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
      const parsed: LessonExcelRow[] = [];
      const header = (lines[0] ?? '').toLowerCase();
      const hasHeader = header.includes('날짜') || header.includes('반') || header.includes('교시');
      const start = hasHeader ? 1 : 0;
      for (let i = start; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        parsed.push({
          date: (cells[0] ?? '').trim(),
          className: (cells[1] ?? '').trim(),
          period: (cells[2] ?? '').trim(),
          teacherName: (cells[3] ?? '').trim(),
        });
      }
      setRows(parsed);
      setStep(2);
      setResult(null);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleRegister = async () => {
    setLoading(true);
    setResult(null);
    let success = 0;
    let fail = 0;
    const classByName = new Map(classOptions.map((c) => [c.name.trim(), c._id]));
    const teacherByName = new Map(teacherOptions.map((t) => [t.name.trim(), t._id]));

    for (const row of rows) {
      if (!row.date || !row.className) {
        fail++;
        continue;
      }
      const classId = classByName.get(row.className) || classOptions.find((c) => c.name.trim() === row.className.trim())?._id;
      const teacherId = teacherByName.get(row.teacherName) || teacherOptions.find((t) => t.name.trim() === row.teacherName.trim())?._id;
      if (!classId || !teacherId) {
        fail++;
        continue;
      }
      try {
        let lessonId: string;
        const createRes = await apiClient.post<{ success: boolean; data: { _id: string } }>('/admin/lesson-days', {
          date: row.date,
          classId,
        });
        if (createRes.data.success && createRes.data.data?._id) {
          lessonId = createRes.data.data._id;
        } else {
          const listRes = await apiClient.get<{ success: boolean; data: { _id: string; date: string; classId: string }[] }>(
            `/admin/lesson-days?dateFrom=${row.date}&dateTo=${row.date}&classId=${classId}`
          );
          const found = listRes.data.success && listRes.data.data?.length ? listRes.data.data[0] : null;
          if (!found) {
            fail++;
            continue;
          }
          lessonId = found._id;
        }
        await apiClient.post(`/admin/lesson-days/${lessonId}/periods`, { teacherId });
        success++;
      } catch {
        fail++;
      }
    }

    setResult({ success, fail });
    setStep(3);
    setLoading(false);
    if (success > 0) onComplete();
  };

  const handleClose = () => {
    setStep(1);
    setRows([]);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={handleClose}>
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-lg max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-950">수업 일괄 등록</h2>
          <p className="text-sm text-slate-500 mt-1">CSV 양식: 날짜, 반, 교시, 담당 강사</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {step === 1 && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-slate-400"
              >
                CSV 파일 선택
              </button>
            </div>
          )}
          {step === 2 && (
            <div>
              <p className="text-sm text-slate-600 mb-2">총 {rows.length}행</p>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 text-sm text-slate-700">
                {rows.slice(0, 20).map((r, i) => (
                  <div key={i}>{r.date}, {r.className}, {r.period}, {r.teacherName}</div>
                ))}
                {rows.length > 20 && <div className="text-slate-400">... 외 {rows.length - 20}행</div>}
              </div>
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="mt-4 w-full py-2.5 bg-slate-950 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? '등록 중...' : '일괄 등록'}
              </button>
            </div>
          )}
          {step === 3 && result && (
            <div>
              <p className="text-slate-700">성공 {result.success}건, 실패 {result.fail}건</p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-4 w-full py-2.5 bg-slate-950 text-white rounded-lg font-medium"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
