import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { biometricUtil } from '../utils/biometric';
import { accessibilityUtil } from '../utils/accessibility';
import { useAuthStore } from '../stores/authStore';
import { getStudentId } from '../services/appStorage';

type LoginScreenNavigationProp = NativeStackNavigationProp<any>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { loginWithBiometric, checkBiometricStatus } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      // 생체인증이 등록되어 있는지 확인
      const isRegistered = checkBiometricStatus();
      
      if (!isRegistered) {
        accessibilityUtil.announceWithVibration(
          '등록된 생체인증 정보가 없습니다. 회원가입을 먼저 진행해주세요.',
          'error'
        );
        
        Alert.alert(
          '생체인증 미등록',
          '등록된 생체인증 정보가 없습니다. 회원가입을 먼저 진행해주세요.',
          [
            {
              text: '회원가입하기',
              onPress: () => navigation.replace('Signup'),
            },
            {
              text: '취소',
              onPress: () => navigation.goBack(),
              style: 'cancel',
            },
          ]
        );
        return;
      }

      // 기기 생체인증 사용 가능 여부 확인
      const { available, reason } = await biometricUtil.canUseBiometric();
      setBiometricAvailable(available);

      if (available) {
        const typeDesc = await biometricUtil.getBiometricTypeDescription();
        setBiometricType(typeDesc);
        accessibilityUtil.announce(`${typeDesc}로 로그인하세요`);
      } else {
        accessibilityUtil.announceWithVibration(
          reason || '생체인증을 사용할 수 없습니다.',
          'error'
        );
        
        Alert.alert(
          '생체인증 불가',
          reason || '생체인증을 사용할 수 없습니다.',
          [
            {
              text: '확인',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('[Login] Biometric check error:', error);
      setBiometricAvailable(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricAvailable) {
      accessibilityUtil.announceWithVibration(
        '생체인증을 사용할 수 없습니다.',
        'error'
      );
      return;
    }

    setIsLoading(true);
    
    try {
      // 생체인증 실행
      const result = await biometricUtil.authenticate({
        promptMessage: `${biometricType}로 로그인하세요`,
        cancelLabel: '취소',
      });

      if (result.success) {
        // 생체인증 성공
        accessibilityUtil.announceWithVibration('인증 성공', 'success');
        
        // 저장된 학번 가져오기
        const studentId = getStudentId();
        
        if (!studentId) {
          throw new Error('저장된 학번이 없습니다. 다시 회원가입해주세요.');
        }

        // TODO: 백엔드 API 호출
        // const response = await loginApi(studentId);
        // loginWithBiometric(studentId, response.accessToken, response.student);
        
        // 임시: 더미 데이터로 로그인
        const dummyStudent = {
          id: 1,
          studentId: studentId,
          name: '홍길동',
          grade: 1,
          classNumber: 1,
        };
        
        loginWithBiometric(
          studentId,
          'dummy-access-token-' + Date.now(),
          dummyStudent
        );
        
        // 로그인 성공 후 Library 화면으로 이동
        navigation.replace('Library');
        
      } else {
        // 생체인증 실패
        accessibilityUtil.announceWithVibration(
          result.error || '인증에 실패했습니다.',
          'error'
        );
        
        Alert.alert(
          '인증 실패',
          result.error || '인증에 실패했습니다. 다시 시도해주세요.',
          [{ text: '확인' }]
        );
      }
    } catch (error) {
      console.error('[Login] Login error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '로그인 중 오류가 발생했습니다.';
      
      accessibilityUtil.announceWithVibration(errorMessage, 'error');
      
      Alert.alert(
        '로그인 오류',
        errorMessage,
        [{ text: '확인' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleGoBack}
        accessible={true}
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
      >
        <Text style={styles.backButtonText}>← 뒤로</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={styles.title}
            accessible={true}
            accessibilityRole="header"
          >
            로그인
          </Text>
          <Text style={styles.subtitle}>
            {biometricType || '생체 인증'}으로{'\n'}로그인하세요
          </Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.biometricButton,
              !biometricAvailable && styles.biometricButtonDisabled,
            ]}
            onPress={handleBiometricLogin}
            disabled={!biometricAvailable || isLoading}
            accessible={true}
            accessibilityLabel={`${biometricType} 인증하기`}
            accessibilityRole="button"
            accessibilityHint="생체 인증을 시작합니다"
            accessibilityState={{ disabled: !biometricAvailable || isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.biometricIcon}>🔐</Text>
                <Text style={styles.biometricButtonText}>
                  {biometricType} 인증
                </Text>
                <Text style={styles.biometricButtonSubtext}>
                  탭하여 인증 시작
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => navigation.navigate('Signup')}
            accessible={true}
            accessibilityLabel="회원가입하기"
            accessibilityRole="button"
          >
            <Text style={styles.helpText}>
              처음 사용하시나요? 회원가입하기
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backButton: {
    paddingTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 24,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 36,
  },
  buttonSection: {
    gap: 24,
    marginBottom: 60,
  },
  biometricButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#45a049',
  },
  biometricButtonDisabled: {
    backgroundColor: '#CCCCCC',
    borderColor: '#999999',
  },
  biometricIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  biometricButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  biometricButtonSubtext: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
  },
  helpButton: {
    padding: 16,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 20,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
});