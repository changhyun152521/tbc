export type TestType = 'weeklyTest' | 'realTest';

export interface TestListItem {
  _id: string;
  testType: TestType;
  classId: string;
  date: string;
  createdAt?: string;
  questionCount?: number;
  subject?: string;
  bigUnit?: string;
  smallUnit?: string;
  source?: string;
  scores?: { studentId: string; score: number }[];
}

export interface TestScoreEntry {
  studentId: string;
  studentName: string;
  score: number;
}
