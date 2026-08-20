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
  /** 학생 코멘트 (학생 메인에 노출) */
  note?: string;
  /** 학부모 코멘트 (학부모 메인에 노출) */
  parentNote?: string;
}

export interface ReviewVideoItem {
  url: string;
  videoId: string;
  title?: string;
  order: number;
}

export interface PeriodItem {
  _id?: string;
  /** 1-based 교시 번호 */
  periodNumber?: number;
  teacherId: string | { _id: string; name: string };
  /** 강사 조회 API: 본인 교시 여부 */
  isMine?: boolean;
  /** 강사 조회 API: 복습영상 편집 가능 여부 */
  canEditReviewVideos?: boolean;
  /** 진도 (수업 내용 메모) */
  memo?: string;
  /** 과제 내용 (자유 입력) */
  homeworkDescription?: string;
  /** 과제 마감기한 (YYYY-MM-DD) */
  homeworkDueDate?: string;
  /** 복습 영상 목록 (다중 지원) */
  reviewVideos?: ReviewVideoItem[];
  /** @deprecated 단일 영상 URL (하위 호환용) */
  reviewVideoUrl?: string;
  /** @deprecated 단일 영상 ID (하위 호환용) */
  reviewVideoId?: string;
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
