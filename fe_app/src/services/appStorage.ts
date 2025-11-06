/**
 * 앱 전반의 범용 저장소
 * - Progress (학습 진도)
 * - StudentId (학번)
 * - TTS Speed (음성 속도)
 * 
 * 참고: 인증 관련은 authStorage.ts 사용
 */
import { createMMKV } from 'react-native-mmkv';
import { LocalProgress } from '../types/progress';

// MMKV 인스턴스 생성
export const storage = createMMKV();

// Storage Keys
const KEYS = {
  PROGRESS: (materialId: string, chapterId: string) => 
    `progress_${materialId}_${chapterId}`,
  STUDENT_ID: 'student_id',
  TTS_SPEED: 'tts_speed',
};

// Progress 관련
export const saveProgress = (progress: LocalProgress): void => {
  try {
    const key = KEYS.PROGRESS(progress.materialId, progress.chapterId);
    storage.set(key, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};

export const getProgress = (
  materialId: string,
  chapterId: string
): LocalProgress | null => {
  try {
    const key = KEYS.PROGRESS(materialId, chapterId);
    const data = storage.getString(key);
    if (!data) return null;
    
    return JSON.parse(data) as LocalProgress;
  } catch (error) {
    console.error('Failed to parse progress:', error);
    return null;
  }
};

export const deleteProgress = (materialId: string, chapterId: string): void => {
  try {
    const key = KEYS.PROGRESS(materialId, chapterId);
    storage.remove(key);
  } catch (error) {
    console.error('Failed to delete progress:', error);
  }
};

export const clearAllProgress = (): void => {
  try {
    const allKeys = storage.getAllKeys();
    allKeys.forEach((key: string) => {
      if (key.startsWith('progress_')) {
        storage.remove(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear progress:', error);
  }
};

// Student ID 관련
export const saveStudentId = (studentId: string): void => {
  try {
    storage.set(KEYS.STUDENT_ID, studentId);
  } catch (error) {
    console.error('Failed to save student ID:', error);
  }
};

export const getStudentId = (): string | null => {
  try {
    return storage.getString(KEYS.STUDENT_ID) ?? null;
  } catch (error) {
    console.error('Failed to get student ID:', error);
    return null;
  }
};

// TTS 속도 설정 관련
export const saveTTSSpeed = (speed: number): void => {
  try {
    storage.set(KEYS.TTS_SPEED, speed);
  } catch (error) {
    console.error('Failed to save TTS speed:', error);
  }
};

export const getTTSSpeed = (): number => {
  try {
    return storage.getNumber(KEYS.TTS_SPEED) ?? 1.0;
  } catch (error) {
    console.error('Failed to get TTS speed:', error);
    return 1.0;
  }
};

export default storage;