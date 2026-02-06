import { useState, useEffect } from 'react';
import {
  getSubjectOptions,
  getBigUnitOptions,
  getSmallUnitOptions,
} from '../../constants/curriculum';
import type { TestType } from '../../types/test';

export interface TestFormValues {
  date: string;
  testType: TestType;
  questionCount: string; // 총 문제수 (문항수)
  subject: string;
  bigUnit: string;
  smallUnit: string;
  source: string;
}

interface TestFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TestFormValues) => void;
  initialValues?: Partial<TestFormValues> | null;
  loading?: boolean;
}

const TEST_TYPE_OPTIONS: { value: TestType; label: string }[] = [
  { value: 'weeklyTest', label: '주간TEST' },
  { value: 'realTest', label: '실전TEST' },
];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TestFormModal({
  open,
  onClose,
  onSubmit,
  initialValues,
  loading = false,
}: TestFormModalProps) {
  const [date, setDate] = useState(todayString());
  const [testType, setTestType] = useState<TestType>('weeklyTest');
  const [questionCount, setQuestionCount] = useState('');
  const [subject, setSubject] = useState('');
  const [bigUnit, setBigUnit] = useState('');
  const [smallUnit, setSmallUnit] = useState('');
  const [source, setSource] = useState('');

  const subjectOptions = getSubjectOptions();
  const bigUnitOptions = getBigUnitOptions(subject);
  const smallUnitOptions = getSmallUnitOptions(subject, bigUnit);

  useEffect(() => {
    if (!open) return;
    setDate(initialValues?.date ?? todayString());
    setTestType(initialValues?.testType ?? 'weeklyTest');
    setQuestionCount(
      initialValues?.questionCount !== undefined && initialValues?.questionCount !== ''
        ? String(initialValues.questionCount)
        : ''
    );
    setSubject(initialValues?.subject ?? '');
    setBigUnit(initialValues?.bigUnit ?? '');
    setSmallUnit(initialValues?.smallUnit ?? '');
    setSource(initialValues?.source ?? '');
  }, [open, initialValues]);

  useEffect(() => {
    if (!subject) {
      setBigUnit('');
      setSmallUnit('');
      return;
    }
    const opts = getBigUnitOptions(subject);
    if (!opts.some((o) => o.value === bigUnit)) setBigUnit('');
    setSmallUnit('');
  }, [subject]);

  useEffect(() => {
    if (!bigUnit) {
      setSmallUnit('');
      return;
    }
    const opts = getSmallUnitOptions(subject, bigUnit);
    if (!opts.some((o) => o.value === smallUnit)) setSmallUnit('');
  }, [bigUnit, subject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = questionCount.trim();
    if (!q || Number(q) < 0) {
      return;
    }
    onSubmit({
      date,
      testType,
      questionCount: q,
      subject,
      bigUnit,
      smallUnit,
      source,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {initialValues ? '시험 수정' : '시험 추가'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">구분</label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as TestType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              {TEST_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">총 문제수</label>
            <input
              type="number"
              min={0}
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="문항 수"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">시험일</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            />
          </div>

          {/* 주간TEST: 과목, 대단원, 소단원 */}
          {testType === 'weeklyTest' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">과목</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">선택</option>
                  {subjectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">대단원</label>
                <select
                  value={bigUnit}
                  onChange={(e) => setBigUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  disabled={!subject}
                >
                  <option value="">선택</option>
                  {bigUnitOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">소단원</label>
                <select
                  value={smallUnit}
                  onChange={(e) => setSmallUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  disabled={!bigUnit}
                >
                  <option value="">선택</option>
                  {smallUnitOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* 실전TEST: 출처 */}
          {testType === 'realTest' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">출처 (선택)</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="예: TBC 자체 제작"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-950 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? '저장 중...' : initialValues ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
