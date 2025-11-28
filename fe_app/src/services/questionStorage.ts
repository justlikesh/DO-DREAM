import { storage } from './appStorage';
import { getStudentInfo } from './authStorage';

/**
 * 질문 메시지 타입
 */
export interface QuestionMessage {
  type: 'user' | 'bot';
  text: string;
  timestamp: string;
}

/**
 * 질문 히스토리 타입
 */
export interface QuestionHistory {
  id: number;           // 고유 ID (timestamp 기반)
  studentId: number;    // 학생 ID
  materialId: string;   // 교재 ID
  chapterId: number;    // 챕터 ID
  sessionId: string;    // RAG API session_id
  messages: QuestionMessage[];  // 전체 대화 메시지
  createdAt: string;    // 생성 시간 (ISO 형식)
  updatedAt: string;    // 마지막 업데이트 시간 (ISO 형식)
}

/**
 * 질문 히스토리 생성 Input
 */
export interface QuestionHistoryCreateInput {
  materialId: string;
  chapterId: number;
  sessionId: string;
  question: string;
  answer: string;
}

/**
 * 질문 히스토리 관련 Storage Keys
 */
const QUESTION_KEY = (questionId: number) => `question_history_${questionId}`;
const QUESTION_LIST_KEY = (materialId: string) => `question_list_${materialId}`;
const ALL_QUESTIONS_KEY = 'all_questions_ids';

/**
 * 질문 히스토리 생성
 */
export const createQuestionHistory = (input: QuestionHistoryCreateInput): QuestionHistory => {
  try {
    const studentInfo = getStudentInfo();
    const studentId = studentInfo?.id || 0;
    const questionId = Date.now(); // number 타입의 고유 ID
    
    const now = new Date().toISOString();
    
    const questionHistory: QuestionHistory = {
      id: questionId,
      studentId,
      materialId: input.materialId,
      chapterId: input.chapterId,
      sessionId: input.sessionId,
      messages: [
        {
          type: 'user',
          text: input.question,
          timestamp: now,
        },
        {
          type: 'bot',
          text: input.answer,
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    // 개별 질문 히스토리 저장
    storage.set(QUESTION_KEY(questionId), JSON.stringify(questionHistory));

    // 교재별 질문 리스트에 추가
    const listKey = QUESTION_LIST_KEY(input.materialId);
    const existingList = storage.getString(listKey);
    const questionIds: number[] = existingList ? JSON.parse(existingList) : [];
    questionIds.push(questionId);
    storage.set(listKey, JSON.stringify(questionIds));

    // 전체 질문 ID 리스트에 추가
    const allQuestionsIds = storage.getString(ALL_QUESTIONS_KEY);
    const allIds: number[] = allQuestionsIds ? JSON.parse(allQuestionsIds) : [];
    if (!allIds.includes(questionId)) {
      allIds.push(questionId);
      storage.set(ALL_QUESTIONS_KEY, JSON.stringify(allIds));
    }

    console.log('[QuestionHistory] Created:', questionId);
    return questionHistory;
  } catch (error) {
    console.error('[QuestionHistory] Failed to create question history:', error);
    throw error;
  }
};

/**
 * 질문 히스토리 조회 (단일)
 */
export const getQuestionHistory = (questionId: number): QuestionHistory | null => {
  try {
    const data = storage.getString(QUESTION_KEY(questionId));
    if (!data) return null;
    
    return JSON.parse(data) as QuestionHistory;
  } catch (error) {
    console.error('[QuestionHistory] Failed to get question history:', error);
    return null;
  }
};

/**
 * 교재별 질문 히스토리 목록 조회 (최신순)
 */
export const getQuestionsByMaterial = (materialId: string): QuestionHistory[] => {
  try {
    const listKey = QUESTION_LIST_KEY(materialId);
    const data = storage.getString(listKey);
    if (!data) return [];

    const questionIds: number[] = JSON.parse(data);
    const questions: QuestionHistory[] = [];

    for (const id of questionIds) {
      const question = getQuestionHistory(id);
      if (question) {
        questions.push(question);
      }
    }

    // 최신순으로 정렬
    return questions.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('[QuestionHistory] Failed to get questions by material:', error);
    return [];
  }
};

/**
 * 전체 질문 히스토리 조회 (최신순)
 */
export const getAllQuestions = (): QuestionHistory[] => {
  try {
    const allQuestionsIds = storage.getString(ALL_QUESTIONS_KEY);
    if (!allQuestionsIds) return [];

    const ids: number[] = JSON.parse(allQuestionsIds);
    const questions: QuestionHistory[] = [];

    for (const id of ids) {
      const question = getQuestionHistory(id);
      if (question) {
        questions.push(question);
      }
    }

    // 최신순으로 정렬
    return questions.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('[QuestionHistory] Failed to get all questions:', error);
    return [];
  }
};

/**
 * 질문 히스토리에 메시지 추가 (추가 질문/답변)
 */
export const addMessageToQuestionHistory = (
  questionId: number,
  message: QuestionMessage
): boolean => {
  try {
    const question = getQuestionHistory(questionId);
    if (!question) {
      console.warn('[QuestionHistory] Question history not found:', questionId);
      return false;
    }

    question.messages.push(message);
    question.updatedAt = new Date().toISOString();
    
    storage.set(QUESTION_KEY(questionId), JSON.stringify(question));
    console.log('[QuestionHistory] Message added:', questionId);
    return true;
  } catch (error) {
    console.error('[QuestionHistory] Failed to add message:', error);
    return false;
  }
};

/**
 * session_id로 질문 히스토리 찾기
 */
export const getQuestionBySessionId = (sessionId: string): QuestionHistory | null => {
  try {
    const allQuestions = getAllQuestions();
    return allQuestions.find(q => q.sessionId === sessionId) || null;
  } catch (error) {
    console.error('[QuestionHistory] Failed to get question by session ID:', error);
    return null;
  }
};

/**
 * 질문 히스토리 삭제
 */
export const deleteQuestionHistory = (questionId: number): boolean => {
  try {
    const question = getQuestionHistory(questionId);
    if (!question) {
      console.warn('[QuestionHistory] Question history not found:', questionId);
      return false;
    }

    // 개별 질문 삭제
    storage.delete(QUESTION_KEY(questionId));

    // 교재별 리스트에서 제거
    const listKey = QUESTION_LIST_KEY(question.materialId);
    const existingList = storage.getString(listKey);
    if (existingList) {
      const questionIds: number[] = JSON.parse(existingList);
      const filtered = questionIds.filter(id => id !== questionId);
      if (filtered.length > 0) {
        storage.set(listKey, JSON.stringify(filtered));
      } else {
        storage.delete(listKey);
      }
    }

    // 전체 질문 ID 리스트에서 제거
    const allQuestionsIds = storage.getString(ALL_QUESTIONS_KEY);
    if (allQuestionsIds) {
      const allIds: number[] = JSON.parse(allQuestionsIds);
      const filtered = allIds.filter(id => id !== questionId);
      if (filtered.length > 0) {
        storage.set(ALL_QUESTIONS_KEY, JSON.stringify(filtered));
      } else {
        storage.delete(ALL_QUESTIONS_KEY);
      }
    }

    console.log('[QuestionHistory] Deleted:', questionId);
    return true;
  } catch (error) {
    console.error('[QuestionHistory] Failed to delete question history:', error);
    return false;
  }
};

/**
 * 교재의 모든 질문 히스토리 삭제
 */
export const deleteQuestionsByMaterial = (materialId: string): boolean => {
  try {
    const questions = getQuestionsByMaterial(materialId);
    
    for (const question of questions) {
      deleteQuestionHistory(question.id);
    }

    console.log('[QuestionHistory] Deleted all questions for material:', materialId);
    return true;
  } catch (error) {
    console.error('[QuestionHistory] Failed to delete questions by material:', error);
    return false;
  }
};

/**
 * 모든 질문 히스토리 삭제
 */
export const clearAllQuestions = (): boolean => {
  try {
    const allQuestions = getAllQuestions();
    
    for (const question of allQuestions) {
      storage.delete(QUESTION_KEY(question.id));
    }

    // 모든 리스트 키 삭제
    const allKeys = storage.getAllKeys();
    allKeys.forEach((key: string) => {
      if (key.startsWith('question_list_') || key === ALL_QUESTIONS_KEY) {
        storage.delete(key);
      }
    });

    console.log('[QuestionHistory] Cleared all questions');
    return true;
  } catch (error) {
    console.error('[QuestionHistory] Failed to clear all questions:', error);
    return false;
  }
};