/**
 * 학생 사용자 정보
 */
export interface Student {
  id: number;
  studentId: string; // 학번
  name: string;
  grade?: number; // 학년
  classNumber?: number; // 반
  createdAt?: string;
}

/**
 * 인증 응답 데이터 (로그인/회원가입 성공 시)
 */
export interface AuthResponseData {
  accessToken: string;
  refreshToken?: string;
  student: Student;
}