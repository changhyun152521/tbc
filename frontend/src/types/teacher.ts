export interface TeacherListItem {
  _id: string;
  name: string;
  userId?: { loginId?: string; name?: string; phone?: string };
  loginId?: string;
  phone?: string;
  classCount?: number;
  description?: string;
  /** 관리자 목록에서만 내려옴 */
  lastAccessAt?: string | null;
}

export interface TeacherFormValues {
  name: string;
  loginId: string;
  password: string;
  phone: string;
  description: string;
}

/** 엑셀 일괄 등록용 행 */
export interface TeacherExcelRow {
  name: string;
  loginId: string;
  password: string;
  phone?: string;
  description?: string;
}
