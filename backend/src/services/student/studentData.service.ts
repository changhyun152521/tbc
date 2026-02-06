import mongoose from 'mongoose';
import { Student } from '../../models/Student.model';
import { Class } from '../../models/Class.model';
import { LessonDay } from '../../models/LessonDay.model';
import type { IPeriod, IStudentRecord } from '../../models/LessonDay.model';
import { Test } from '../../models/Test.model';

const RECENT_LIMIT = 10;

/**
 * studentId로 해당 학생의 classId 조회.
 * 1) Student.classId 사용, 없으면 2) 반 목록(Class.studentIds)에 포함된 반 ID 반환.
 * (관리자에서 '반에 학생 추가' 시 Class.studentIds만 갱신되고 Student.classId는 미설정일 수 있음)
 */
export async function getStudentClassId(studentId: string): Promise<mongoose.Types.ObjectId | null> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return null;
  const student = await Student.findById(studentId).select('classId').lean().exec();
  if (student?.classId) return student.classId as mongoose.Types.ObjectId;
  const sid = new mongoose.Types.ObjectId(studentId);
  const classDoc = await Class.findOne({ studentIds: sid }).select('_id').lean().exec();
  return classDoc?._id ?? null;
}

/**
 * 학생이 소속된 모든 반 목록 조회 (Class.studentIds에 포함된 반)
 */
export async function getStudentClasses(studentId: string): Promise<{ _id: mongoose.Types.ObjectId; name: string }[]> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return [];
  const sid = new mongoose.Types.ObjectId(studentId);
  const classes = await Class.find({ studentIds: sid }).select('_id name').sort({ name: 1 }).lean().exec();
  return classes.map((c) => ({ _id: c._id as mongoose.Types.ObjectId, name: c.name }));
}

/** period.teacherId가 populate된 경우 name 추출 */
function getTeacherName(period: IPeriod & { teacherId?: mongoose.Types.ObjectId | { name?: string } }): string {
  const t = period.teacherId;
  if (!t) return '';
  if (typeof t === 'object' && t !== null && 'name' in t && typeof (t as { name?: string }).name === 'string') {
    return (t as { name: string }).name;
  }
  return '';
}

/** LessonDay 목록을 해당 학생 기준 진도/과제 행으로 변환 (프론트와 호환되는 형태) */
function flattenLessonDaysForStudent(
  lessonDays: { _id: mongoose.Types.ObjectId; date: Date; periods: (IPeriod & { teacherId?: mongoose.Types.ObjectId | { name?: string } })[] }[],
  studentId: string
): { _id: string; date: Date; period: string; progress: string; homework: string; homeworkDone: boolean; attendanceStatus: string; homeworkDescription?: string; homeworkDueDate?: string; teacherName?: string; note?: string }[] {
  const sid = studentId;
  const result: { _id: string; date: Date; period: string; progress: string; homework: string; homeworkDone: boolean; attendanceStatus: string; homeworkDescription?: string; homeworkDueDate?: string; teacherName?: string; note?: string }[] = [];
  for (const day of lessonDays) {
    const periods = (day.periods || []) as (IPeriod & { teacherId?: mongoose.Types.ObjectId | { name?: string } })[];
    periods.forEach((period, idx) => {
      const record = (period.records || []).find(
        (r: IStudentRecord) => r.studentId?.toString() === sid
      ) as IStudentRecord | undefined;
      const attendance = record?.attendance ?? '';
      const hw = record?.homework ?? '';
      const p = period as IPeriod & { homeworkDescription?: string; homeworkDueDate?: Date };
      const dueDate = p.homeworkDueDate
        ? new Date(p.homeworkDueDate).toISOString().slice(0, 10)
        : undefined;
      const noteStr = (record?.note ?? '').trim() || undefined;
      result.push({
        _id: `${day._id}-${idx}`,
        date: day.date,
        period: String(idx + 1),
        progress: (period as IPeriod & { memo?: string }).memo ?? '',
        homework: hw === 'O' ? '제출' : hw === 'X' ? '미제출' : '',
        homeworkDone: hw === 'O',
        attendanceStatus: attendance,
        homeworkDescription: (p.homeworkDescription ?? '').trim() || undefined,
        homeworkDueDate: dueDate,
        teacherName: getTeacherName(period) || undefined,
        note: noteStr,
      });
    });
  }
  return result;
}

/**
 * 학생 대시보드: 학생 기본 정보, 소속 반, 최근 수업, 최근 테스트, 과제 요약, 출결 요약
 * 진도/과제는 관리자 수업관리(LessonDay) 데이터 기준으로 조회
 */
export async function getDashboard(studentId: string, classIdParam?: string | null) {
  const studentDoc = await Student.findById(studentId).select('name school grade classId').lean().exec();
  const studentInfo = studentDoc
    ? { id: studentId, name: studentDoc.name, school: studentDoc.school, grade: studentDoc.grade }
    : null;

  let classId: mongoose.Types.ObjectId | null = null;
  if (classIdParam && mongoose.Types.ObjectId.isValid(classIdParam)) {
    const classes = await getStudentClasses(studentId);
    if (classes.some((c) => c._id.toString() === classIdParam)) {
      classId = new mongoose.Types.ObjectId(classIdParam);
    }
  }
  if (!classId) {
    classId = studentDoc?.classId
      ? (studentDoc.classId as mongoose.Types.ObjectId)
      : await getStudentClassId(studentId);
  }
  if (!classId || !studentInfo) {
    return {
      student: studentInfo ?? { id: studentId, name: '', school: '', grade: '' },
      class: null,
      teacherNames: [],
      recentLessons: [],
      recentTests: [],
      homeworkSummary: { total: 0, done: 0, rate: 0 },
      attendanceSummary: { total: 0, attended: 0, rate: 0 },
      recentHomework: [],
      recentComments: [],
    };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [classDoc, lessonDaysRecent, lessonDaysAll, recentTests] = await Promise.all([
    Class.findById(classId).select('name description teacherIds').populate('teacherIds', 'name').lean().exec(),
    LessonDay.find({ classId }).populate('periods.teacherId', 'name').sort({ date: -1 }).limit(RECENT_LIMIT * 2).lean().exec(),
    LessonDay.find({ classId }).populate('periods.teacherId', 'name').sort({ date: -1 }).lean().exec(),
    Test.find({ classId }).sort({ date: -1 }).limit(RECENT_LIMIT).lean().exec(),
  ]);

  const teacherNames: string[] = [];
  if (classDoc?.teacherIds && Array.isArray(classDoc.teacherIds)) {
    const seen = new Set<string>();
    for (const t of classDoc.teacherIds) {
      const name = typeof t === 'object' && t !== null && 'name' in t ? (t as { name: string }).name : '';
      if (name && !seen.has(name)) {
        seen.add(name);
        teacherNames.push(name);
      }
    }
  }

  const recentLessonsFlat = flattenLessonDaysForStudent(lessonDaysRecent, studentId);
  const recentLessons = recentLessonsFlat.slice(0, RECENT_LIMIT);

  const allLessonsFlat = flattenLessonDaysForStudent(lessonDaysAll, studentId);
  const homeworkWithContent = allLessonsFlat.filter((l) => l.homework !== '' || l.progress.trim() !== '');
  const homeworkDone = allLessonsFlat.filter((l) => l.homeworkDone === true);
  const attendanceTotal = allLessonsFlat.length;
  const attendanceAttended = allLessonsFlat.filter((l) => (l.attendanceStatus ?? '').trim() !== '').length;

  const lessonDate = (d: Date | string) => (d instanceof Date ? d : new Date(d)).getTime();
  const last7Days = allLessonsFlat.filter((l) => lessonDate(l.date) >= sevenDaysAgo.getTime());

  const recentHomework = last7Days
    .filter((l) => (l.homeworkDescription ?? '').trim() !== '' || (l.homeworkDueDate ?? '').trim() !== '')
    .map((l) => ({
      _id: l._id,
      date: typeof l.date === 'string' ? l.date : (l.date as Date).toISOString?.() ?? String(l.date),
      teacherName: l.teacherName ?? '',
      homeworkDescription: (l.homeworkDescription ?? '').trim() || undefined,
      homeworkDueDate: (l.homeworkDueDate ?? '').trim() || undefined,
      homeworkDone: l.homeworkDone === true,
    }))
    .slice(0, 20);

  const recentComments = last7Days
    .filter((l) => (l.note ?? '').trim() !== '')
    .map((l) => ({
      _id: l._id,
      date: typeof l.date === 'string' ? l.date : (l.date as Date).toISOString?.() ?? String(l.date),
      teacherName: l.teacherName ?? '',
      note: (l.note ?? '').trim(),
    }))
    .slice(0, 20);

  const recentTestsWithMyScore = recentTests.map((t) => {
    const entry = (t.scores || []).find(
      (s: { studentId: mongoose.Types.ObjectId }) => s.studentId.toString() === studentId
    );
    return {
      ...t,
      myScore: entry?.score ?? null,
    };
  });

  return {
    student: studentInfo,
    class: classDoc
      ? { _id: classDoc._id, name: classDoc.name, description: classDoc.description ?? '' }
      : null,
    teacherNames,
    recentLessons,
    recentTests: recentTestsWithMyScore,
    homeworkSummary: {
      total: homeworkWithContent.length,
      done: homeworkDone.length,
      rate: homeworkWithContent.length ? (homeworkDone.length / homeworkWithContent.length) * 100 : 0,
    },
    attendanceSummary: {
      total: attendanceTotal,
      attended: attendanceAttended,
      rate: attendanceTotal ? (attendanceAttended / attendanceTotal) * 100 : 0,
    },
    recentHomework,
    recentComments,
  };
}

/**
 * 학생 소속 반의 수업 목록. 관리자 수업관리(LessonDay) 기준, 날짜 필터(from, to) 선택
 */
export async function getLessons(
  studentId: string,
  from?: string,
  to?: string,
  classIdParam?: string | null
): Promise<{ lessons: unknown[] } | null> {
  let classId: mongoose.Types.ObjectId | null = null;
  if (classIdParam && mongoose.Types.ObjectId.isValid(classIdParam)) {
    const classes = await getStudentClasses(studentId);
    if (classes.some((c) => c._id.toString() === classIdParam)) {
      classId = new mongoose.Types.ObjectId(classIdParam);
    }
  }
  if (!classId) classId = await getStudentClassId(studentId);
  if (!classId) return null;

  const filter: Record<string, unknown> = { classId };
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  const lessonDays = await LessonDay.find(filter)
    .populate('periods.teacherId', 'name')
    .sort({ date: -1 })
    .lean()
    .exec();
  const lessons = flattenLessonDaysForStudent(lessonDays, studentId);
  return { lessons };
}

/**
 * 학생 소속 반의 테스트 목록 + 본인 점수, 평균
 */
export async function getTests(studentId: string, classIdParam?: string | null): Promise<unknown | null> {
  let classId: mongoose.Types.ObjectId | null = null;
  if (classIdParam && mongoose.Types.ObjectId.isValid(classIdParam)) {
    const classes = await getStudentClasses(studentId);
    if (classes.some((c) => c._id.toString() === classIdParam)) {
      classId = new mongoose.Types.ObjectId(classIdParam);
    }
  }
  if (!classId) classId = await getStudentClassId(studentId);
  if (!classId) return null;

  const tests = await Test.find({ classId }).sort({ date: -1 }).lean().exec();
  const sid = studentId;

  const list = tests.map((t) => {
    const entry = (t.scores || []).find(
      (s: { studentId: mongoose.Types.ObjectId }) => s.studentId.toString() === sid
    );
    const scoreValues = (t.scores || []).map((s: { score: number }) => s.score);
    const average =
      scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : null;
    const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : null;
    return {
      ...t,
      myScore: entry?.score ?? null,
      average: average !== null ? Math.round(average * 100) / 100 : null,
      maxScore: maxScore !== null ? Math.round(maxScore * 100) / 100 : null,
    };
  });

  return { tests: list };
}

/**
 * 월별 통계: 해당 월 출결, 과제 이행률, 테스트 평균 (진도/과제는 LessonDay 기준)
 */
export async function getMonthlyStatistics(
  studentId: string,
  year: number,
  month: number,
  classIdParam?: string | null
): Promise<unknown | null> {
  let classId: mongoose.Types.ObjectId | null = null;
  if (classIdParam && mongoose.Types.ObjectId.isValid(classIdParam)) {
    const classes = await getStudentClasses(studentId);
    if (classes.some((c) => c._id.toString() === classIdParam)) {
      classId = new mongoose.Types.ObjectId(classIdParam);
    }
  }
  if (!classId) classId = await getStudentClassId(studentId);
  if (!classId) return null;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const [lessonDays, tests] = await Promise.all([
    LessonDay.find({ classId, date: { $gte: start, $lte: end } }).lean().exec(),
    Test.find({ classId, date: { $gte: start, $lte: end } }).lean().exec(),
  ]);

  const lessonsFlat = flattenLessonDaysForStudent(lessonDays, studentId);
  const homeworkWithContent = lessonsFlat.filter((l) => (l.homework ?? '').trim() !== '' || (l.progress ?? '').trim() !== '');
  const homeworkDone = lessonsFlat.filter((l) => l.homeworkDone === true);
  const attendanceTotal = lessonsFlat.length;
  const attendanceAttended = lessonsFlat.filter(
    (l) => (l.attendanceStatus ?? '').trim() !== ''
  ).length;

  const sid = studentId;
  const myScores = tests
    .map((t) => {
      const entry = (t.scores || []).find(
        (s: { studentId: mongoose.Types.ObjectId }) => s.studentId.toString() === sid
      );
      return entry?.score;
    })
    .filter((s): s is number => s !== undefined && s !== null);

  const testAverage =
    myScores.length > 0 ? myScores.reduce((a, b) => a + b, 0) / myScores.length : null;

  return {
    year,
    month,
    attendance: {
      total: attendanceTotal,
      attended: attendanceAttended,
      rate: attendanceTotal ? (attendanceAttended / attendanceTotal) * 100 : 0,
    },
    homework: {
      total: homeworkWithContent.length,
      done: homeworkDone.length,
      rate: homeworkWithContent.length ? (homeworkDone.length / homeworkWithContent.length) * 100 : 0,
    },
    testAverage: testAverage !== null ? Math.round(testAverage * 100) / 100 : null,
    testCount: myScores.length,
  };
}
