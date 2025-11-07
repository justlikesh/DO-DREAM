// Request/Response 인터셉터
import { AxiosInstance } from 'axios';
import { getAccessToken } from '../services/authStorage';
import { accessibilityUtil } from '../utils/accessibility';

export const setupInterceptors = (instance: AxiosInstance) => {
  // Request 인터셉터 - Access Token 추가
  instance.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response 인터셉터 - 에러 처리
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // 토큰 만료 처리
        accessibilityUtil.announceWithVibration(
          '로그인이 만료되었습니다',
          'warning'
        );
      }
      return Promise.reject(error);
    }
  );
};