/**
 * RAG 질의응답 요청 바디
 * POST /rag/chat
 */
export interface RagChatRequest {
  /**
   * 현재 학습 중인 자료의 material id
   * - 백엔드: document_id
   * - 앱에서는 materialId를 문자열로 변환해서 전달
   */
  document_id: string;

  /**
   * 사용자가 텍스트나 음성으로 입력한 질문 내용
   * (음성 명령 "말하기 시작/종료" 같은 제어용 문구는 제외)
   */
  question: string;

  /**
   * 이전 질문에서 받은 세션 ID
   * - 첫 질문일 경우 생략 가능
   * - 이어서 묻는 경우 이전 응답의 session_id를 그대로 넘긴다.
   */
  session_id?: string | null;
}

/**
 * RAG 질의응답 응답 바디
 * POST /rag/chat → 200
 */
export interface RagChatResponse {
  /** 서버가 생성한 답변 텍스트 */
  answer: string;

  /** 이 대화 세션을 식별하는 ID */
  session_id: string;
}
