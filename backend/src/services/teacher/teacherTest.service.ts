import mongoose from 'mongoose';
import { Test } from '../../models/Test.model';
import { ITest } from '../../models/Test.model';
import { canAccessClass } from './teacherClass.service';

export type TestType = 'weeklyTest' | 'realTest';

export interface CreateTestInput {
  classId: string;
  testType: TestType;
  date: Date;
  questionCount?: number;
  subject?: string;
  bigUnit?: string;
  smallUnit?: string;
  source?: string;
}

export interface UpdateTestInput {
  date?: Date;
  questionCount?: number;
  subject?: string;
  bigUnit?: string;
  smallUnit?: string;
  source?: string;
}

export async function createTest(
  input: CreateTestInput,
  userId: string,
  role: string
): Promise<ITest | null> {
  const allowed = await canAccessClass(input.classId, userId, role);
  if (!allowed) return null;

  const test = await Test.create({
    classId: new mongoose.Types.ObjectId(input.classId),
    testType: input.testType,
    date: input.date,
    questionCount: input.questionCount,
    scores: [],
    subject: input.subject,
    bigUnit: input.bigUnit,
    smallUnit: input.smallUnit,
    source: input.source,
  });
  return test;
}

export async function listTestsByClass(classId: string, userId: string, role: string) {
  const allowed = await canAccessClass(classId, userId, role);
  if (!allowed) return null;
  return Test.find({ classId: new mongoose.Types.ObjectId(classId) })
    .sort({ date: -1 })
    .lean()
    .exec();
}

export async function getTestById(
  testId: string,
  userId: string,
  role: string
): Promise<ITest | null> {
  const test = await Test.findById(testId).populate('classId', 'name').exec();
  if (!test) return null;
  const classIdStr = typeof test.classId === 'object' && test.classId && '_id' in test.classId
    ? (test.classId as { _id: mongoose.Types.ObjectId })._id.toString()
    : (test.classId as mongoose.Types.ObjectId).toString();
  const allowed = await canAccessClass(classIdStr, userId, role);
  if (!allowed) return null;
  return test;
}

export async function updateTest(
  testId: string,
  input: UpdateTestInput,
  userId: string,
  role: string
): Promise<ITest | null> {
  const test = await Test.findById(testId).exec();
  if (!test) return null;
  const allowed = await canAccessClass(test.classId.toString(), userId, role);
  if (!allowed) return null;

  if (input.date !== undefined) test.date = input.date;
  if (input.questionCount !== undefined) test.questionCount = input.questionCount;
  if (input.subject !== undefined) test.subject = input.subject;
  if (input.bigUnit !== undefined) test.bigUnit = input.bigUnit;
  if (input.smallUnit !== undefined) test.smallUnit = input.smallUnit;
  if (input.source !== undefined) test.source = input.source;
  await test.save();
  return test;
}

export async function deleteTest(testId: string, userId: string, role: string): Promise<boolean> {
  const test = await Test.findById(testId).exec();
  if (!test) return false;
  const allowed = await canAccessClass(test.classId.toString(), userId, role);
  if (!allowed) return false;
  await Test.findByIdAndDelete(testId);
  return true;
}

/** 테스트별 점수 목록(학생별). scores 배열 + 학생 이름 등 */
export async function getTestScores(testId: string, userId: string, role: string) {
  const test = await Test.findById(testId).exec();
  if (!test) return null;
  const allowed = await canAccessClass(test.classId.toString(), userId, role);
  if (!allowed) return null;
  const { Student } = await import('../../models/Student.model');
  const scores = (test.scores || []).map(async (entry: { studentId: mongoose.Types.ObjectId; score: number }) => {
    const student = await Student.findById(entry.studentId).select('name').lean().exec();
    return {
      studentId: entry.studentId.toString(),
      studentName: student?.name ?? '',
      score: entry.score,
    };
  });
  return Promise.all(scores);
}

/** 점수 입력/수정 (한 학생). scores 배열에서 해당 studentId 있으면 갱신, 없으면 추가 */
export async function upsertTestScore(
  testId: string,
  studentId: string,
  score: number,
  userId: string,
  role: string
): Promise<ITest | null> {
  const test = await Test.findById(testId).exec();
  if (!test) return null;
  const allowed = await canAccessClass(test.classId.toString(), userId, role);
  if (!allowed) return null;

  const sid = new mongoose.Types.ObjectId(studentId);
  const scores = test.scores || [];
  const idx = scores.findIndex((s: { studentId: mongoose.Types.ObjectId }) => s.studentId.toString() === studentId);
  if (idx >= 0) {
    scores[idx].score = score;
  } else {
    scores.push({ studentId: sid, score });
  }
  test.scores = scores;
  await test.save();
  return test;
}
