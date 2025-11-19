import { QuizQuestion } from "../quiz";

/**
 * 퀴즈 채점 요청 시 개별 답변 타입
 */
export interface QuizAnswerRequest {
  quizId: number; // 질문 ID (백엔드에서는 quizId로 명명)
  answer: string; // 학생의 답변
}

/**
 * 퀴즈 채점 요청 페이로드
 */
export interface QuizAnswerPayload {
  answers: QuizAnswerRequest[];
}

/**
 * 퀴즈 채점 결과 항목
 */
export interface QuizGradingResultItem extends QuizQuestion {
  is_correct: boolean;
}