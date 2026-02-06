export interface StudentListItem {
  _id: string;
  name: string;
  school: string;
  grade: string;
  studentPhone: string;
  parentPhone: string;
  classCount?: number;
}

export interface StudentFormValues {
  name: string;
  school: string;
  grade: string;
  studentPhone: string;
  parentPhone: string;
  /** 비워두면 학생 전화번호로 자동 설정 */
  studentLoginId?: string;
  /** 비워두면 학생 전화번호로 자동 설정. 수정 시 변경할 때만 입력 */
  studentPassword?: string;
  /** 비워두면 학부모 전화번호로 자동 설정 */
  parentLoginId?: string;
  /** 비워두면 학부모 전화번호로 자동 설정. 수정 시 변경할 때만 입력 */
  parentPassword?: string;
}

export const GRADE_OPTIONS = [
  { value: '', label: '전체 학년' },
  { value: '중1', label: '중1' },
  { value: '중2', label: '중2' },
  { value: '중3', label: '중3' },
  { value: '고1', label: '고1' },
  { value: '고2', label: '고2' },
  { value: '고3', label: '고3' },
];
