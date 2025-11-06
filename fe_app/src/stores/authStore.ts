import { create } from 'zustand';
import type { Student } from '../types/auth';
import {
  saveAccessToken,
  removeAccessToken,
  getAccessToken,
  saveRefreshToken,
  removeRefreshToken,
  saveStudentInfo,
  removeStudentInfo,
  getStudentInfo,
  clearAuthData,
  saveBiometricEnabled,
  isBiometricEnabled as checkBiometricEnabled,
} from '../services/authStorage';
import { saveStudentId, getStudentId } from '../services/appStorage';

/**
 * 인증 Store 상태 인터페이스
 */
interface AuthState {
  // 상태
  student: Student | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
  
  // 액션
  setStudent: (student: Student | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 비즈니스 로직
  hydrate: () => void;
  loginWithBiometric: (studentId: string, accessToken: string, student: Student) => void;
  signup: (accessToken: string, student: Student) => void;
  logout: () => void;
  enableBiometric: (enabled: boolean) => void;
  checkBiometricStatus: () => boolean;
  
  // 초기화
  clear: () => void;
}

/**
 * Zustand Auth Store
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // 초기 상태
  student: null,
  accessToken: null,
  isLoading: false,
  error: null,
  isHydrated: false,

  // 기본 액션
  setStudent: (student) => {
    set({ student });
    if (student) {
      saveStudentInfo(student);
      saveStudentId(student.studentId);
    }
  },

  setAccessToken: (accessToken) => {
    set({ accessToken });
    if (accessToken) {
      saveAccessToken(accessToken);
    } else {
      removeAccessToken();
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Hydrate: 앱 시작 시 저장된 인증 정보 복원
  hydrate: () => {
    console.log('[AuthStore] Hydrating...');
    try {
      const token = getAccessToken();
      const studentInfo = getStudentInfo<Student>();
      
      if (token && studentInfo) {
        set({
          accessToken: token,
          student: studentInfo,
          isHydrated: true,
        });
        console.log('[AuthStore] Hydrated successfully');
      } else {
        set({ isHydrated: true });
        console.log('[AuthStore] No stored auth data');
      }
    } catch (error) {
      console.error('[AuthStore] Hydration error:', error);
      set({ isHydrated: true });
    }
  },

  // 생체인증 로그인
  loginWithBiometric: (studentId, accessToken, student) => {
    console.log('[AuthStore] Login with biometric');
    set({
      student,
      accessToken,
      error: null,
    });
    
    saveAccessToken(accessToken);
    saveStudentInfo(student);
    saveStudentId(studentId);
  },

  // 회원가입 (생체인증 등록 포함)
  signup: (accessToken, student) => {
    console.log('[AuthStore] Signup');
    set({
      student,
      accessToken,
      error: null,
    });
    
    saveAccessToken(accessToken);
    saveStudentInfo(student);
    saveStudentId(student.studentId);
    
    // 회원가입 시 자동으로 생체인증 활성화
    saveBiometricEnabled(true);
  },

  // 로그아웃
  logout: () => {
    console.log('[AuthStore] Logout');
    set({
      student: null,
      accessToken: null,
      error: null,
    });
    
    clearAuthData();
    // 생체인증 설정은 유지
  },

  // 생체인증 사용 설정
  enableBiometric: (enabled) => {
    saveBiometricEnabled(enabled);
  },

  // 생체인증 사용 여부 확인
  checkBiometricStatus: () => {
    return checkBiometricEnabled();
  },

  // 모든 상태 초기화
  clear: () => {
    set({
      student: null,
      accessToken: null,
      isLoading: false,
      error: null,
    });
    clearAuthData();
  },
}));