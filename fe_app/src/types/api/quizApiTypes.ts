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
 * API로부터 받는 원시 채점 결과 타입 (snake_case)
 */
export interface RawQuizGradingResult {
  question_id: number;
  is_correct: boolean;
  student_answer: string;
  ai_feedback: string;
  correct: boolean; // is_correct와 중복될 수 있음
}

/**
 * 앱 내부에서 사용할 최종 채점 결과 항목 타입 (camelCase)
 */
export interface QuizGradingResultItem extends QuizQuestion {
  question_number: number;
  userAnswer: string;
  isCorrect: boolean;
  feedback?: string;
}