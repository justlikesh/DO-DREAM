// fcmService.ts
import { Alert, Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  requestPermission,
  hasPermission,
  getToken as modularGetToken,
  onTokenRefresh as modularOnTokenRefresh,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { fcmApi } from '../api/fcmApi';

/**
 * FCM 초기화 함수
 * - 첫 실행 시 푸시 알림 권한 요청
 * - 현재 기기의 FCM 토큰을 백엔드에 등록
 * - 토큰이 갱신될 경우 자동으로 재등록
 */
type InitOptions = { registerOnInit?: boolean };

export async function initFcm(options: InitOptions = { registerOnInit: true }) {
  try {
    const app = getApp();
    const msg = getMessaging(app);

    // 현재 권한 상태 확인
    const currentStatus = await hasPermission(msg);
    const enabled =
      currentStatus === AuthorizationStatus.AUTHORIZED ||
      currentStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      // 시스템 권한창을 띄우기 전 사용자에게 안내
      Alert.alert(
        '알림 권한 요청',
        '두드림 앱의 중요한 소식을 받기 위해 푸시 알림 권한을 허용해 주세요.',
      );

      try {
        // 실제 권한 요청 (사용자가 거부할 수도 있음)
        await requestPermission(msg);
      } catch (e) {
        // 거부하더라도 앱이 종료되지 않도록 예외 처리
        console.warn('[FCM] 알림 권한 요청이 거부됨:', e);
      }
    }

    // 초기화 시 토큰 등록 (Mock 모드일 때는 생략)
    if (options.registerOnInit) {
      await registerFcmToken();
    }

    // 토큰이 새로 발급될 때마다 재등록
    modularOnTokenRefresh(msg, async (newToken) => {
      try {
        await postToken(newToken);
        console.log('[FCM] 새 토큰이 발급되어 서버에 재등록 완료');
      } catch (e) {
        console.error('[FCM] 새 토큰 등록 중 오류 발생:', e);
      }
    });
  } catch (error) {
    console.error('[FCM] initFcm 실행 중 오류:', error);
  }
}

/**
 * 현재 기기의 FCM 토큰을 가져와 서버에 등록
 * - 여러 번 호출해도 서버에서 중복 처리됨
 */
export async function registerFcmToken() {
  try {
    const app = getApp();
    const msg = getMessaging(app);
    const token = await modularGetToken(msg);

    if (!token) {
      console.warn('[FCM] 등록 가능한 토큰이 없습니다.');
      return;
    }

    await postToken(token);
    console.log('[FCM] FCM 토큰 서버 등록 완료');
  } catch (error) {
    console.error('[FCM] registerFcmToken 실행 중 오류:', error);
  }
}

/**
 * 서버에 토큰 등록 요청
 * - OS 종류(ANDROID/IOS)를 함께 전송
 */
async function postToken(token: string) {
  const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  await fcmApi.registerToken({ token, deviceType });
}
