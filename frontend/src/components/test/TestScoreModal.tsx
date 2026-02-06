import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { TestScoreEntry } from '../../types/test';
import type { ClassStudentItem } from '../../types/class';

interface TestScoreModalProps {
  open: boolean;
  onClose: () => void;
  testId: string;
  testLabel: string;
  /** 총 문항수 (맞은 개수 입력 시 상한 및 안내용) */
  questionCount?: number;
  classStudents: ClassStudentItem[];
  onSaved?: () => void;
}

export default function TestScoreModal({
  open,
  onClose,
  testId,
  testLabel,
  questionCount,
  classStudents,
  onSaved,
}: TestScoreModalProps) {
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /** 가나다순 정렬된 학생 목록 */
  const sortedStudents = [...classStudents].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'ko')
  );

  useEffect(() => {
    if (!open || !testId) return;
    setLoading(true);
    setError('');
    apiClient
      .get<{ success: boolean; data: TestScoreEntry[] }>(`/teacher/tests/${testId}/scores`)
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.data)) {
          const map: Record<string, string> = {};
          res.data.data.forEach((e) => {
            map[e.studentId] = String(e.score);
          });
          classStudents.forEach((s) => {
            if (map[s._id] === undefined) map[s._id] = '';
          });
          setScores(map);
        } else {
          const map: Record<string, string> = {};
          classStudents.forEach((s) => { map[s._id] = ''; });
          setScores(map);
        }
      })
      .catch(() => {
        setError('점수 목록을 불러올 수 없습니다.');
        const map: Record<string, string> = {};
        classStudents.forEach((s) => { map[s._id] = ''; });
        setScores(map);
      })
      .finally(() => setLoading(false));
  }, [open, testId, classStudents]);

  const handleChange = (studentId: string, value: string) => {
    setScores((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSave = async () => {
    setError('');
    if (questionCount != null && questionCount >= 0) {
      for (const student of sortedStudents) {
        const raw = scores[student._id];
        if (raw === '') continue;
        const score = Number(raw);
        if (!Number.isNaN(score) && score > questionCount) {
          setError(
            `맞은 개수는 총 문항수(${questionCount}문항)를 넘을 수 없습니다. 초과된 학생의 입력값을 확인한 뒤 다시 저장해 주세요.`
          );
          return;
        }
      }
    }
    setSaving(true);
    try {
      for (const student of sortedStudents) {
        const raw = scores[student._id];
        const score = raw === '' ? NaN : Number(raw);
        if (Number.isNaN(score)) continue;
        await apiClient.post(`/teacher/tests/${testId}/scores`, {
          studentId: student._id,
          score,
        });
      }
      onSaved?.();
      onClose();
    } catch {
      setError('점수 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">맞은 개수 입력 · {testLabel}</h2>
          {questionCount != null && (
            <p className="text-sm text-slate-500 mt-1">총 {questionCount}문항 중 맞은 개수를 입력하세요.</p>
          )}
        </div>
        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
        )}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-slate-500">로딩 중...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-600 text-[13px] font-semibold">
                  <th className="p-3 w-12 text-center">No.</th>
                  <th className="p-3">이름</th>
                  <th className="p-3 w-32">맞은 개수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[14px]">
                {sortedStudents.map((s, index) => (
                  <tr key={s._id}>
                    <td className="p-3 text-center text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-slate-900">{s.name}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        max={questionCount ?? undefined}
                        step={1}
                        value={scores[s._id] ?? ''}
                        onChange={(e) => handleChange(s._id, e.target.value)}
                        className="w-24 px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-slate-950 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
