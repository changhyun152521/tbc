export type AttendanceHomeworkValue = 'O' | 'X' | '';

export interface LessonDayListItem {
  _id: string;
  classId: string | { _id: string; name: string };
  className?: string;
  date: string;
  periodCount: number;
}

export interface StudentRecord {
  studentId: string | { _id: string; name: string };
  attendance: AttendanceHomeworkValue;
  homework: AttendanceHomeworkValue;
  /** COMMENT (학생·학부모 화면에 노출) */
  note?: string;
}

export interface PeriodItem {
  _id?: string;
  teacherId: string | { _id: string; name: string };
  /** 진도 (수업 내용 메모) */
  memo?: string;
  /** 과제 내용 (자유 입력) */
  homeworkDescription?: string;
  /** 과제 마감기한 (YYYY-MM-DD) */
  homeworkDueDate?: string;
  records: StudentRecord[];
}

export interface LessonDayDetail {
  _id: string;
  classId: { _id: string; name: string; studentIds?: { _id: string }[] };
  date: string;
  periods: PeriodItem[];
}

export interface LessonDayFormValues {
  date: string;
  classId: string;
}
