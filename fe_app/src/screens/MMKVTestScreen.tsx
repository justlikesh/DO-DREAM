import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage, saveProgress, getProgress } from '../services/storage';
import { LocalProgress } from '../types/progress';

export default function MMKVTestScreen() {
  const [testResult, setTestResult] = useState<string>('테스트를 시작하세요');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testBasicOperations = () => {
    try {
      addLog('=== 기본 작업 테스트 시작 ===');
      
      // 1. 문자열 저장/읽기
      storage.set('test_string', 'Hello MMKV!');
      const str = storage.getString('test_string');
      addLog(`문자열 테스트: ${str === 'Hello MMKV!' ? '✅ 성공' : '❌ 실패'}`);
      
      // 2. 숫자 저장/읽기
      storage.set('test_number', 42);
      const num = storage.getNumber('test_number');
      addLog(`숫자 테스트: ${num === 42 ? '✅ 성공' : '❌ 실패'}`);
      
      // 3. 불린 저장/읽기
      storage.set('test_boolean', true);
      const bool = storage.getBoolean('test_boolean');
      addLog(`불린 테스트: ${bool === true ? '✅ 성공' : '❌ 실패'}`);
      
      // 4. 삭제
      storage.remove('test_string');
      const deleted = storage.getString('test_string');
      addLog(`삭제 테스트: ${deleted === undefined ? '✅ 성공' : '❌ 실패'}`);
      
      addLog('=== 기본 작업 테스트 완료 ===');
      setTestResult('✅ 기본 작업 테스트 성공!');
    } catch (error) {
      addLog(`❌ 에러 발생: ${error}`);
      setTestResult('❌ 기본 작업 테스트 실패!');
      Alert.alert('에러', String(error));
    }
  };

  const testProgressSave = () => {
    try {
      addLog('=== Progress 저장 테스트 시작 ===');
      
      const testProgress: LocalProgress = {
        materialId: 'test-book-1',
        chapterId: 'test-chapter-1',
        currentSectionIndex: 5,
        lastAccessedAt: new Date().toISOString(),
        isCompleted: false,
      };
      
      // 저장
      saveProgress(testProgress);
      addLog('Progress 저장 완료');
      
      // 읽기
      const loaded = getProgress('test-book-1', 'test-chapter-1');
      if (loaded) {
        addLog(`읽은 데이터: 섹션 ${loaded.currentSectionIndex}`);
        addLog(`저장/읽기 테스트: ${loaded.currentSectionIndex === 5 ? '✅ 성공' : '❌ 실패'}`);
        setTestResult('✅ Progress 저장 테스트 성공!');
      } else {
        addLog('❌ 데이터를 읽을 수 없음');
        setTestResult('❌ Progress 저장 테스트 실패!');
      }
      
      addLog('=== Progress 저장 테스트 완료 ===');
    } catch (error) {
      addLog(`❌ 에러 발생: ${error}`);
      setTestResult('❌ Progress 저장 테스트 실패!');
      Alert.alert('에러', String(error));
    }
  };

  const testAllKeys = () => {
    try {
      addLog('=== 전체 키 조회 테스트 ===');
      const allKeys = storage.getAllKeys();
      addLog(`저장된 키 개수: ${allKeys.length}`);
      allKeys.forEach((key: any) => addLog(`- ${key}`));
      setTestResult(`✅ 총 ${allKeys.length}개의 키 발견`);
    } catch (error) {
      addLog(`❌ 에러 발생: ${error}`);
      setTestResult('❌ 키 조회 실패!');
      Alert.alert('에러', String(error));
    }
  };

  const clearAll = () => {
    try {
      storage.clearAll();
      addLog('=== 모든 데이터 삭제 완료 ===');
      setTestResult('✅ 모든 데이터 삭제 완료');
    } catch (error) {
      addLog(`❌ 에러 발생: ${error}`);
      Alert.alert('에러', String(error));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>MMKV 저장소 테스트</Text>
      
      <View style={styles.resultBox}>
        <Text style={styles.resultText}>{testResult}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testBasicOperations}>
          <Text style={styles.buttonText}>1️⃣ 기본 작업 테스트</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testProgressSave}>
          <Text style={styles.buttonText}>2️⃣ Progress 저장 테스트</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testAllKeys}>
          <Text style={styles.buttonText}>3️⃣ 전체 키 조회</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearAll}>
          <Text style={styles.buttonText}>🗑️ 모두 삭제</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logTitle}>실행 로그:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  resultBox: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 8,
    padding: 12,
  },
  logTitle: {
    color: '#00ff00',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});