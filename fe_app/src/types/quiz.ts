export type QuestionType = 'TERM_DEFINITION' | 'FILL_BLANK' | 'SHORT_ANSWER' | 'CUSTOM';

export interface QuizQuestion {
  id: number; // 퀴즈 고유 ID
  question_type: QuestionType;
  question_number: number;
  title: string;
  content: string;
  correct_answer: string;
  chapter_reference: string;
}

export interface Quiz {
  id: number;
  materialId: string;
  chapterId: string;
  title: string;
  quizType: 'AI_GENERATED' | 'TEACHER_CREATED';
  createdAt: Date;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  studentId: number;  // 학생 고유 ID (학번으로 변경해서 보여줘야 함)
  score: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface StudentAnswer {
  id: number;
  attemptId: number;
  quizId: number;
  optionId: number;
  isCorrect: boolean;
  answeredAt: Date;
  reviewedAt?: Date;
}