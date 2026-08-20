export interface StudentListItem {
  _id: string;
  name: string;
  school: string;
  grade: string;
  studentPhone: string;
  parentPhone: string;
  /** 관리자가 해당 학생 화면으로 접속할 때 사용하는 로그인 ID (비밀번호: admin) */
  adminAccessLoginId?: string | null;
  classCount?: number;
  /** 관리자 목록에서만 내려옴 — 학생 본인 계정 최근 접속 */
  lastAccessAt?: string | null;
  /** 관리자 목록에서만 내려옴 — 학부모 계정 최근 접속 */
  parentLastAccessAt?: string | null;
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
