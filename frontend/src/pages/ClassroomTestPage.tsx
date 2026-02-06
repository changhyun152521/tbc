import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ClassDetail } from '../types/class';
import type { TestListItem, TestFormValues } from '../types/test';
import TestFormModal from '../components/test/TestFormModal';
import TestScoreModal from '../components/test/TestScoreModal';

const TEST_TYPE_LABEL: Record<string, string> = {
  weeklyTest: '주간TEST',
  realTest: '실전TEST',
};

export default function ClassroomTestPage() {
  const { classId } = useParams<{ classId: string }>();
  const [classInfo, setClassInfo] = useState<ClassDetail | null>(null);
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestListItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scoreModalTest, setScoreModalTest] = useState<TestListItem | null>(null);

  const fetchClass = useCallback(async () => {
    if (!classId) return;
    try {
      const res = await apiClient.get<{ success: boolean; data: ClassDetail }>(
        `/admin/classes/${classId}`
      );
      if (res.data.success && res.data.data) setClassInfo(res.data.data);
      else setClassInfo(null);
    } catch {
      setClassInfo(null);
    }
  }, [classId]);

  const fetchTests = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: TestListItem[] }>(
        `/teacher/classes/${classId}/tests`
      );
      if (res.data.success && Array.isArray(res.data.data)) setTests(res.data.data);
      else setTests([]);
    } catch {
      setError('시험 목록을 불러올 수 없습니다.');
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchClass();
  }, [fetchClass]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const openAddForm = () => {
    setEditingTest(null);
    setFormOpen(true);
  };

  const openEditForm = (test: TestListItem) => {
    setEditingTest(test);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: TestFormValues) => {
    if (!classId) return;
    setFormLoading(true);
    setError('');
    const questionCountNum = values.questionCount ? Number(values.questionCount) : undefined;
    const payload: Record<string, unknown> = {
      date: values.date,
      questionCount: questionCountNum,
      subject: values.subject || undefined,
      bigUnit: values.bigUnit || undefined,
      smallUnit: values.smallUnit || undefined,
      source: values.source || undefined,
    };
    if (values.testType === 'realTest') {
      payload.subject = undefined;
      payload.bigUnit = undefined;
      payload.smallUnit = undefined;
    } else {
      payload.source = undefined;
    }
    try {
      if (editingTest) {
        await apiClient.put(`/teacher/tests/${editingTest._id}`, payload);
      } else {
        await apiClient.post(`/teacher/classes/${classId}/tests`, {
          testType: values.testType,
          ...payload,
        });
      }
      setFormOpen(false);
      setEditingTest(null);
      fetchTests();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (test: TestListItem) => {
    if (!window.confirm(`이 시험을 삭제할까요?`)) return;
    setError('');
    try {
      await apiClient.delete(`/teacher/tests/${test._id}`);
      fetchTests();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const openScoreModal = (test: TestListItem) => {
    setScoreModalTest(test);
    setScoreModalOpen(true);
  };

  const classStudents = classInfo?.studentIds ?? [];

  const getTestLabel = (t: TestListItem) => {
    const typeLabel = TEST_TYPE_LABEL[t.testType] ?? t.testType;
    const count = t.questionCount != null ? `${t.questionCount}문항` : '';
    return count ? `${typeLabel} ${count}` : typeLabel;
  };

  /** 24시 기준, 모바일에서 한 줄로 보이도록 compact 포맷 */
  const formatCreatedAt = (d: string | undefined) => {
    if (!d) return '-';
    try {
      const date = new Date(d);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${y}.${m}.${day} ${h}:${min}`;
    } catch {
      return d;
    }
  };

  if (!classId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">반 정보가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-6 px-4 sm:px-6 lg:px-10 pb-12">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/admin/tests"
              className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
            >
              ← 시험 관리
            </Link>
            <h1 className="text-2xl font-title font-bold text-slate-950">
              {classInfo?.name ?? '로딩 중...'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">시험을 추가하고 점수를 입력할 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
          >
            시험 추가
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-500">로딩 중...</div>
          ) : (
            <div className="overflow-x-auto scrollbar-table">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 text-[13px] font-semibold">
                    <th className="p-4">생성일</th>
                    <th className="p-4">구분</th>
                    <th className="p-4">문항수</th>
                    <th className="p-4 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[14px]">
                  {tests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        등록된 시험이 없습니다. 시험 추가 버튼으로 등록하세요.
                      </td>
                    </tr>
                  ) : (
                    tests.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50 text-slate-700">
                        <td className="p-4 text-slate-600 text-xs sm:text-[14px] whitespace-nowrap">{formatCreatedAt(t.createdAt)}</td>
                        <td className="p-4 font-medium text-slate-900">
                          {TEST_TYPE_LABEL[t.testType] ?? t.testType}
                        </td>
                        <td className="p-4">{t.questionCount != null ? `${t.questionCount}문항` : '-'}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => openEditForm(t)}
                              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-100"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(t)}
                              className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                            >
                              삭제
                            </button>
                            <button
                              type="button"
                              onClick={() => openScoreModal(t)}
                              className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                            >
                              점수
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <TestFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTest(null); }}
        onSubmit={handleFormSubmit}
        initialValues={
          editingTest
            ? {
                date: editingTest.date.slice(0, 10),
                testType: editingTest.testType,
                questionCount:
                  editingTest.questionCount != null ? String(editingTest.questionCount) : '',
                subject: editingTest.subject ?? '',
                bigUnit: editingTest.bigUnit ?? '',
                smallUnit: editingTest.smallUnit ?? '',
                source: editingTest.source ?? '',
              }
            : null
        }
        loading={formLoading}
      />

      <TestScoreModal
        open={scoreModalOpen}
        onClose={() => { setScoreModalOpen(false); setScoreModalTest(null); }}
        testId={scoreModalTest?._id ?? ''}
        testLabel={scoreModalTest ? getTestLabel(scoreModalTest) : ''}
        questionCount={scoreModalTest?.questionCount}
        classStudents={classStudents}
        onSaved={() => fetchTests()}
      />
    </div>
  );
}
