import apiClient from "./apiClient";
import type { RagChatRequest, RagChatResponse } from "../types/api/ragApiTypes";

const RAG_ENDPOINTS = {
  CHAT: "/ai/rag/chat",
};

/**
 * RAG 기반 질의응답 API 래퍼
 * - 인증된 사용자만 호출 가능 (Authorization 헤더는 인터셉터에서 자동 부착)
 */
export const ragApi = {
  /**
   * RAG 질의응답 호출
   * POST /rag/chat
   */
  chat: async (payload: RagChatRequest): Promise<RagChatResponse> => {
    const response = await apiClient.post<RagChatResponse>(
      RAG_ENDPOINTS.CHAT,
      payload
    );
    return response.data;
  },
};

export default ragApi;
