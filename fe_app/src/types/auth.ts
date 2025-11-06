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

/**
 * 회원가입 요청 바디 (학번 + 이름 인증)
 */
export interface SignupRequest {
  studentId: string; // 학번
  name: string; // 이름
}

/**
 * 로그인 요청 바디 (생체인증 후 학번으로)
 */
export interface LoginRequest {
  studentId: string; // 학번
}

/**
 * API 성공 응답 구조
 */
export interface ApiSuccessResponse<T = null> {
  code: string;
  message: string;
  status: 200 | 201;
  data: T;
  timestamp: string;
}

/**
 * API 에러 응답 구조
 */
export interface ApiErrorResponse<T = null> {
  code: string;
  message: string;
  status: number;
  data: T;
  timestamp: string;
}

/**
 * API 응답 타입 (성공 또는 에러)
 */
export type ApiResponse<T = null> = ApiSuccessResponse<T> | ApiErrorResponse;