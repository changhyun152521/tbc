export interface TeacherRef {
  _id: string;
  name: string;
}

export interface ClassListItem {
  _id: string;
  name: string;
  description?: string;
  teacherIds: TeacherRef[];
  studentIds?: string[];
  studentCount?: number;
  createdAt: string;
}

/** 수업관리 반 목록용: 오늘 등록 교시 수 포함 */
export interface ClassListItemForLesson extends ClassListItem {
  todayPeriodCount?: number;
}

/** 시험관리 반 목록용: 등록된 시험 수 포함 */
export interface ClassListItemForTest extends ClassListItem {
  testCount?: number;
}

export interface ClassFormValues {
  name: string;
  teacherIds: string[];
  description?: string;
}

/** 반 상세 조회 시 학생 한 명 (populate) */
export interface ClassStudentItem {
  _id: string;
  name: string;
  school: string;
  grade: string;
  studentPhone: string;
  parentPhone: string;
}

export interface ClassDetail {
  _id: string;
  name: string;
  description?: string;
  teacherIds: TeacherRef[];
  studentIds: ClassStudentItem[];
  createdAt: string;
}

/** 엑셀 일괄 등록용 행 */
export interface ClassExcelRow {
  name: string;
  description?: string;
}
