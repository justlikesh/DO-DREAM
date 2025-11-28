/**
 * @description 학습 진행률 업데이트 요청 바디
 */
export interface UpdateProgressRequest {
  materialId: number;
  currentPage: number;
  totalPages?: number; // optional
}

/**
 * @description 학습 진행률 업데이트 응답 데이터
 */
export interface UpdateProgressData {
  studentId: number;
  materialId: number;
  currentPage: number;
  totalPages: number;
  progressPercentage: number;
  lastAccessedAt: string; // ISO 8601 날짜 문자열
  completedAt: string | null; // 완료되지 않았을 경우 null일 수 있음
  message: string;
  completed: boolean;
}

// =================================================================
// 2. GET /api/progress/materials/{materialId} (특정 교재 학습 진행률 조회)
// 3. GET /api/progress/all (모든 교재 학습 진행률 조회)
// =================================================================

/**
 * @description 챕터별 상세 진행률
 */
export interface ChapterProgress {
  chapterId: string;
  chapterTitle: string;
  chapterType: string;
  chapterNumber: number;
  totalSections: number;
  completedSections: number;
  progressPercentage: number;
  completed: boolean;
}

/**
 * @description 교재별 상세 진행률 데이터 (특정/전체 조회 시 공통 사용)
 */
export interface MaterialProgress {
  studentId: number;
  studentName: string;
  materialId: number;
  materialTitle: string;
  totalChapters: number;
  completedChapters: number;
  totalSections: number;
  completedSections: number;
  overallProgressPercentage: number;
  currentChapterNumber: number;
  currentChapterTitle: string;
  lastAccessedAt: string; // ISO 8601 날짜 문자열
  completedAt: string | null; // 완료되지 않았을 경우 null일 수 있음
  chapterProgress: ChapterProgress[];
}
