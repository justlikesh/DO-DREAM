import apiClient from './apiClient';
import type { QuizQuestion } from '../types/quiz';
import { QuizAnswerPayload, QuizGradingResultItem } from '../types/api/quizApiTypes';

/**
 * 특정 학습자료의 퀴즈 목록을 조회합니다.
 * @param materialId 학습자료 ID
 * @returns Promise<QuizQuestion[]>
 */
export const fetchQuizzes = async (materialId: number | string): Promise<QuizQuestion[]> => {
  try {
    const response = await apiClient.get<QuizQuestion[]>(`/api/materials/${materialId}/quizzes`);
    return response.data;
  } catch (error) {
    console.error('[API] fetchQuizzes 에러:', error);
    throw error;
  }
};

/**
 * 퀴즈 답안을 제출하고 채점 결과를 받습니다.
 * @param materialId 학습자료 ID
 * @param payload 제출할 답안 데이터
 * @returns Promise<QuizGradingResultItem[]>
 */
export const submitQuizAnswers = async (materialId: number | string, payload: QuizAnswerPayload): Promise<QuizGradingResultItem[]> => {
  try {
    const response = await apiClient.post<QuizGradingResultItem[]>(`/api/materials/${materialId}/quizzes/submit`, payload);
    return response.data;
  } catch (error) {
    console.error('[API] submitQuizAnswers 에러:', error);
    throw error;
  }
};