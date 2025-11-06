import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { accessibilityUtil } from '../utils/accessibility';

type AuthStartScreenNavigationProp = NativeStackNavigationProp<any>;

export default function AuthStartScreen() {
  const navigation = useNavigation<AuthStartScreenNavigationProp>();

  useEffect(() => {
    // 화면 진입 시 안내
    accessibilityUtil.announce(
      '두드림 앱입니다. 로그인 또는 회원가입을 선택하세요.'
    );
  }, []);

  const handleLoginPress = () => {
    accessibilityUtil.lightImpact();
    navigation.navigate('Login');
  };

  const handleSignupPress = () => {
    accessibilityUtil.lightImpact();
    navigation.navigate('Signup');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* 앱 로고/제목 */}
        <View style={styles.header}>
          <Text
            style={styles.appName}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="두드림"
          >
            두드림
          </Text>
          <Text style={styles.subtitle}>
            시각장애 학생을 위한{'\n'}학습 지원 서비스
          </Text>
        </View>

        {/* 버튼 영역 */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={handleLoginPress}
            accessible={true}
            accessibilityLabel="로그인"
            accessibilityRole="button"
            accessibilityHint="생체 인증으로 로그인합니다"
          >
            <Text style={styles.buttonText}>로그인</Text>
            <Text style={styles.buttonSubtext}>등록된 생체 인증으로</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.signupButton]}
            onPress={handleSignupPress}
            accessible={true}
            accessibilityLabel="회원가입"
            accessibilityRole="button"
            accessibilityHint="학번과 이름을 입력하여 회원가입합니다"
          >
            <Text style={styles.buttonText}>회원가입</Text>
            <Text style={styles.buttonSubtext}>처음 사용하시나요?</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  appName: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#192B55',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 20,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 32,
  },
  buttonSection: {
    gap: 20,
    marginBottom: 60,
  },
  button: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
    borderWidth: 3,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
  },
  signupButton: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  buttonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  buttonSubtext: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
  },
});