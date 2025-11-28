import apiClient from "./apiClient";
import { AxiosResponse } from "axios";
import {
  UpdateProgressRequest,
  UpdateProgressData,
  MaterialProgress,
} from "../types/api/progressApiTypes";
import { ApiResponse } from "../types/api/api";

const PROGRESS_ENDPOINTS = {
  UPDATE: "/api/progress/update",
  BY_MATERIAL: (materialId: number) => `/api/progress/materials/${materialId}`,
  ALL: "/api/progress/all",
};

/**
 * @description 학습 진행률을 업데이트합니다. (학생/앱)
 * @param {UpdateProgressRequest} data - 업데이트할 진행률 정보
 * @returns {Promise<ApiResponse<UpdateProgressData>>} 업데이트 결과
 */
export const updateProgress = async (
  data: UpdateProgressRequest
): Promise<ApiResponse<UpdateProgressData>> => {
  const response: AxiosResponse<ApiResponse<UpdateProgressData>> =
    await apiClient.post(PROGRESS_ENDPOINTS.UPDATE, data);
  return response.data;
};

/**
 * @description 특정 교재의 상세 학습 진행률을 조회합니다. (학생/앱)
 * @param {number} materialId - 조회할 교재의 ID
 * @returns {Promise<ApiResponse<MaterialProgress>>} 특정 교재의 진행률 정보
 */
export const fetchMaterialProgress = async (
  materialId: number
): Promise<ApiResponse<MaterialProgress>> => {
  const response: AxiosResponse<ApiResponse<MaterialProgress>> =
    await apiClient.get(PROGRESS_ENDPOINTS.BY_MATERIAL(materialId));
  return response.data;
};

/**
 * @description 학생이 공유받은 모든 교재의 학습 진행률을 조회합니다. (학생/앱)
 * @returns {Promise<ApiResponse<MaterialProgress[]>>} 모든 교재의 진행률 정보
 */
export const fetchAllProgress = async (): Promise<
  ApiResponse<MaterialProgress[]>
> => {
  const response: AxiosResponse<ApiResponse<MaterialProgress[]>> =
    await apiClient.get(PROGRESS_ENDPOINTS.ALL);
  return response.data;
};
