package A704.DODREAM.report.service;

import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.entity.MaterialShare;
import A704.DODREAM.material.repository.MaterialRepository;
import A704.DODREAM.material.repository.MaterialShareRepository;
import A704.DODREAM.progress.entity.StudentMaterialProgress;
import A704.DODREAM.report.dto.ChapterProgressDto;
import A704.DODREAM.report.dto.ProgressReportResponse;
import A704.DODREAM.report.repository.StudentMaterialProgressRepository;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 학습 진행률 리포트 서비스
 * Chapter와 Section 기반 진행률 계산
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgressReportService {

    private final StudentMaterialProgressRepository progressRepository;
    private final MaterialRepository materialRepository;
    private final MaterialShareRepository materialShareRepository;
    private final UserRepository userRepository;
    private final S3Client s3Client;
    private final ObjectMapper objectMapper;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    /**
     * 특정 학생의 특정 교재에 대한 진행률 리포트 조회
     */
    public ProgressReportResponse getProgressReport(Long studentId, Long materialId) {
        // 1. 학생 조회
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 2. 공유 권한 확인
        MaterialShare share = materialShareRepository.findByStudentIdAndMaterialId(studentId, materialId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATERIAL_NOT_FOUND));

        Material material = share.getMaterial();

        // 3. 진행 상태 조회
        StudentMaterialProgress progress = progressRepository
                .findByStudentIdAndMaterialId(studentId, materialId)
                .orElse(null);

        // 4. S3에서 JSON 가져와서 분석
        Map<String, Object> jsonData = getMaterialJsonFromS3(material);
        log.info("JSON 구조 확인 - keys: {}", jsonData.keySet());
        
        // parsedData 구조 확인 및 chapters 추출
        List<Map<String, Object>> chapters = null;
        
        // 패턴 1: parsedData.data 구조
        Map<String, Object> parsedData = (Map<String, Object>) jsonData.get("parsedData");
        if (parsedData != null) {
            log.info("parsedData 구조 확인 - keys: {}", parsedData.keySet());
            chapters = (List<Map<String, Object>>) parsedData.get("data");
        }
        
        // 패턴 2: 직접 data 구조 (fallback)
        if (chapters == null) {
            log.warn("parsedData.data를 찾을 수 없어서 직접 data를 확인합니다.");
            chapters = (List<Map<String, Object>>) jsonData.get("data");
        }

        if (chapters == null || chapters.isEmpty()) {
            log.error("chapters를 찾을 수 없습니다. JSON keys: {}, parsedData keys: {}", 
                    jsonData.keySet(), 
                    parsedData != null ? parsedData.keySet() : "null");
            throw new CustomException(ErrorCode.INVALID_JSON_STRUCTURE);
        }
        
        log.info("챕터 수: {}", chapters.size());

        // 5. 챕터별 진행률 계산
        List<ChapterProgressDto> chapterProgressList = calculateChapterProgress(chapters, progress);

        // 6. 전체 통계 계산
        int totalChapters = chapters.size();
        int totalSections = chapterProgressList.stream()
                .mapToInt(ChapterProgressDto::getTotalSections)
                .sum();
        
        int completedChapters = (int) chapterProgressList.stream()
                .filter(ChapterProgressDto::isCompleted)
                .count();
        
        int completedSections = chapterProgressList.stream()
                .mapToInt(ChapterProgressDto::getCompletedSections)
                .sum();

        double overallProgress = totalSections > 0 
                ? (double) completedSections / totalSections * 100.0 
                : 0.0;

        // 7. 현재 학습 중인 챕터 찾기
        ChapterProgressDto currentChapter = findCurrentChapter(chapterProgressList);

        return ProgressReportResponse.builder()
                .studentId(student.getId())
                .studentName(student.getName())
                .materialId(material.getId())
                .materialTitle(material.getTitle())
                .totalChapters(totalChapters)
                .completedChapters(completedChapters)
                .totalSections(totalSections)
                .completedSections(completedSections)
                .overallProgressPercentage(Math.round(overallProgress * 100.0) / 100.0)
                .currentChapterNumber(currentChapter != null ? currentChapter.getChapterNumber() : null)
                .currentChapterTitle(currentChapter != null ? currentChapter.getChapterTitle() : null)
                .lastAccessedAt(progress != null ? progress.getLastAccessedAt() : null)
                .completedAt(progress != null ? progress.getCompletedAt() : null)
                .chapterProgress(chapterProgressList)
                .build();
    }

    /**
     * 특정 학생의 모든 교재에 대한 진행률 요약 조회
     */
    public List<ProgressReportResponse> getAllProgressReports(Long studentId) {
        // 학생 조회
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 공유받은 모든 교재 조회
        List<MaterialShare> shares = materialShareRepository.findByStudentId(studentId);

        List<ProgressReportResponse> reports = new ArrayList<>();
        for (MaterialShare share : shares) {
            try {
                ProgressReportResponse report = getProgressReport(studentId, share.getMaterial().getId());
                reports.add(report);
            } catch (Exception e) {
                log.error("진행률 계산 실패: studentId={}, materialId={}", 
                        studentId, share.getMaterial().getId(), e);
            }
        }

        return reports;
    }

    /**
     * S3에서 Material JSON 가져오기
     */
    private Map<String, Object> getMaterialJsonFromS3(Material material) {
        if (material.getUploadedFile() == null) {
            log.error("UploadedFile이 null입니다. materialId={}", material.getId());
            throw new CustomException(ErrorCode.FILE_PARSING_FAILED);
        }
        
        if (material.getUploadedFile().getJsonS3Key() == null) {
            log.error("JSON S3 Key가 null입니다. materialId={}, fileId={}", 
                    material.getId(), material.getUploadedFile().getId());
            throw new CustomException(ErrorCode.FILE_PARSING_FAILED);
        }

        try {
            String s3Key = material.getUploadedFile().getJsonS3Key();
            log.info("S3에서 JSON 조회 시도: bucket={}, key={}", bucketName, s3Key);
            
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getRequest);
            String jsonString = new String(response.readAllBytes());
            
            log.info("S3에서 JSON 조회 성공: materialId={}, size={} bytes", 
                    material.getId(), jsonString.length());

            return objectMapper.readValue(jsonString, Map.class);
        } catch (Exception e) {
            log.error("S3에서 JSON 조회 실패: materialId={}, error={}", 
                    material.getId(), e.getMessage(), e);
            throw new RuntimeException("JSON 조회 실패: " + e.getMessage());
        }
    }

    /**
     * 챕터별 진행률 계산
     * 실제 JSON 구조(parsedData.data)를 분석하여 각 챕터의 섹션 수를 계산
     */
    private List<ChapterProgressDto> calculateChapterProgress(
            List<Map<String, Object>> chapters,
            StudentMaterialProgress progress) {
        
        List<ChapterProgressDto> result = new ArrayList<>();
        int currentPage = progress != null ? progress.getCurrentPage() : 1;
        int cumulativeSections = 0;

        for (int i = 0; i < chapters.size(); i++) {
            Map<String, Object> chapter = chapters.get(i);
            
            String chapterId = (String) chapter.get("index");
            String chapterTitle = (String) chapter.get("index_title");
            
            // Section 수 계산: titles, s_titles, ss_titles, concept_checks 모두 카운팅
            int totalSections = calculateSectionsFromChapter(chapter);
            
            // 현재 진행 상황에 따른 완료된 섹션 계산
            int completedSections;
            boolean isCompleted;

            if (progress == null) {
                completedSections = 0;
                isCompleted = false;
            } else {
                int chapterStartPage = cumulativeSections + 1;
                int chapterEndPage = cumulativeSections + totalSections;

                if (currentPage > chapterEndPage) {
                    // 이 챕터는 완료됨
                    completedSections = totalSections;
                    isCompleted = true;
                } else if (currentPage >= chapterStartPage) {
                    // 현재 이 챕터를 학습 중
                    completedSections = currentPage - chapterStartPage + 1;
                    isCompleted = false;
                } else {
                    // 아직 시작하지 않음
                    completedSections = 0;
                    isCompleted = false;
                }
            }

            double progressPercentage = totalSections > 0 
                    ? (double) completedSections / totalSections * 100.0 
                    : 0.0;

            // concept_checks가 있으면 quiz 타입으로 간주
            List<Map<String, Object>> conceptChecks = (List<Map<String, Object>>) chapter.get("concept_checks");
            String chapterType = (conceptChecks != null && !conceptChecks.isEmpty()) ? "quiz" : "content";

            result.add(ChapterProgressDto.builder()
                    .chapterId(chapterId)
                    .chapterTitle(chapterTitle)
                    .chapterType(chapterType)
                    .chapterNumber(i + 1)
                    .totalSections(totalSections)
                    .completedSections(completedSections)
                    .progressPercentage(Math.round(progressPercentage * 100.0) / 100.0)
                    .isCompleted(isCompleted)
                    .build());

            cumulativeSections += totalSections;
        }

        return result;
    }

    /**
     * 챕터에서 섹션 수 계산
     * 실제 JSON 구조를 기반으로 titles, s_titles, ss_titles, concept_checks를 모두 카운팅
     */
    private int calculateSectionsFromChapter(Map<String, Object> chapter) {
        int sectionCount = 0;

        // 1. titles 배열 처리
        List<Map<String, Object>> titles = (List<Map<String, Object>>) chapter.get("titles");
        if (titles != null) {
            for (Map<String, Object> title : titles) {
                // title 자체도 하나의 섹션
                sectionCount++;

                // s_titles 배열 처리
                List<Map<String, Object>> sTitles = (List<Map<String, Object>>) title.get("s_titles");
                if (sTitles != null) {
                    for (Map<String, Object> sTitle : sTitles) {
                        // s_title도 하나의 섹션
                        sectionCount++;

                        // ss_titles 배열 처리
                        List<Map<String, Object>> ssTitles = (List<Map<String, Object>>) sTitle.get("ss_titles");
                        if (ssTitles != null) {
                            // 각 ss_title도 하나의 섹션
                            sectionCount += ssTitles.size();
                        }
                    }
                }
            }
        }

        // 2. concept_checks 배열 처리
        List<Map<String, Object>> conceptChecks = (List<Map<String, Object>>) chapter.get("concept_checks");
        if (conceptChecks != null) {
            // 각 concept_check를 하나의 섹션으로 카운팅
            sectionCount += conceptChecks.size();
        }

        // 최소 1개 섹션 보장
        return Math.max(1, sectionCount);
    }

    /**
     * 현재 학습 중인 챕터 찾기
     */
    private ChapterProgressDto findCurrentChapter(List<ChapterProgressDto> chapterProgress) {
        // 완료되지 않은 첫 번째 챕터를 현재 챕터로 간주
        for (ChapterProgressDto chapter : chapterProgress) {
            if (!chapter.isCompleted()) {
                return chapter;
            }
        }
        
        // 모든 챕터가 완료된 경우 마지막 챕터 반환
        if (!chapterProgress.isEmpty()) {
            return chapterProgress.get(chapterProgress.size() - 1);
        }
        
        return null;
    }
}

