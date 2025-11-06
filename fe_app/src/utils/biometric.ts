import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * 생체인증 유형
 */
export enum BiometricType {
  FINGERPRINT = 'FINGERPRINT',
  FACIAL_RECOGNITION = 'FACIAL_RECOGNITION',
  IRIS = 'IRIS',
  NONE = 'NONE',
}

/**
 * 생체인증 결과
 */
export interface BiometricResult {
  success: boolean;
  error?: string;
  biometricType?: BiometricType;
}

/**
 * 생체인증 유틸리티 클래스
 */
class BiometricUtil {
  /**
   * 기기가 생체인증을 지원하는지 확인
   */
  async isSupported(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      return compatible;
    } catch (error) {
      console.error('생체인증 지원 확인 오류:', error);
      return false;
    }
  }

  /**
   * 생체인증이 등록되어 있는지 확인
   */
  async isEnrolled(): Promise<boolean> {
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('생체인증 등록 확인 오류:', error);
      return false;
    }
  }

  /**
   * 사용 가능한 생체인증 유형 확인
   */
  async getSupportedTypes(): Promise<BiometricType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometricTypes: BiometricType[] = [];

      types.forEach((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            biometricTypes.push(BiometricType.FINGERPRINT);
            break;
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            biometricTypes.push(BiometricType.FACIAL_RECOGNITION);
            break;
          case LocalAuthentication.AuthenticationType.IRIS:
            biometricTypes.push(BiometricType.IRIS);
            break;
        }
      });

      return biometricTypes;
    } catch (error) {
      console.error('생체인증 유형 확인 오류:', error);
      return [];
    }
  }

  /**
   * 생체인증 유형 설명 문자열 반환
   */
  async getBiometricTypeDescription(): Promise<string> {
    const types = await this.getSupportedTypes();
    
    if (types.includes(BiometricType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : '얼굴 인식';
    } else if (types.includes(BiometricType.FINGERPRINT)) {
      return '지문 인증';
    } else if (types.includes(BiometricType.IRIS)) {
      return '홍채 인식';
    }
    
    return '생체 인증';
  }

  /**
   * 생체인증 실행
   */
  async authenticate(options?: {
    promptMessage?: string;
    cancelLabel?: string;
    disableDeviceFallback?: boolean;
  }): Promise<BiometricResult> {
    try {
      // 지원 여부 확인
      const isSupported = await this.isSupported();
      if (!isSupported) {
        return {
          success: false,
          error: '이 기기는 생체인증을 지원하지 않습니다.',
        };
      }

      // 등록 여부 확인
      const isEnrolled = await this.isEnrolled();
      if (!isEnrolled) {
        return {
          success: false,
          error: '등록된 생체인증 정보가 없습니다. 기기 설정에서 생체인증을 등록해주세요.',
        };
      }

      // 생체인증 유형 확인
      const types = await this.getSupportedTypes();
      const biometricType = types[0] || BiometricType.NONE;
      const typeDescription = await this.getBiometricTypeDescription();

      // 생체인증 실행
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options?.promptMessage || `${typeDescription}로 인증하세요`,
        cancelLabel: options?.cancelLabel || '취소',
        disableDeviceFallback: options?.disableDeviceFallback ?? true,
      });

      if (result.success) {
        return {
          success: true,
          biometricType,
        };
      } else {
        return {
          success: false,
          error: '인증에 실패했습니다.',
        };
      }
    } catch (error) {
      console.error('생체인증 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '인증 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 생체인증 사용 가능 여부 확인 (지원 + 등록)
   */
  async canUseBiometric(): Promise<{
    available: boolean;
    reason?: string;
  }> {
    const isSupported = await this.isSupported();
    if (!isSupported) {
      return {
        available: false,
        reason: '이 기기는 생체인증을 지원하지 않습니다.',
      };
    }

    const isEnrolled = await this.isEnrolled();
    if (!isEnrolled) {
      return {
        available: false,
        reason: '등록된 생체인증 정보가 없습니다.',
      };
    }

    return { available: true };
  }
}

export const biometricUtil = new BiometricUtil();