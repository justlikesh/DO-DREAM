package A704.DODREAM.file.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.file.service.PdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pdf")
@Tag(name = "PDF API", description = "PDF 파싱 및 분석 API")
public class PdfController {

  @Autowired
  private PdfService pdfService;

  /**
   * PDF 파싱 (JSON S3 저장 포함)
   */
  @Operation(
      summary = "PDF 파싱 및 구조 추출",
      description = "S3에 저장된 PDF를 CloudFront를 통해 다운로드하여 Gemini AI로 파싱합니다. " +
          "PDF의 텍스트, 목차, 구조를 추출하여 JSON 형태로 S3에 저장하고 결과를 반환합니다. " +
          "파싱 처리 시간은 PDF 크기에 따라 수십 초에서 수 분이 걸릴 수 있습니다."
  )
  @PostMapping("/{pdfId}/parse")
  public ResponseEntity<Map<String, Object>> parsePdf(
      @PathVariable Long pdfId,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L; // 기본값 1L (테스트용)
    Map<String, Object> result = pdfService.parsePdfAndSave(pdfId, userId);
    return ResponseEntity.ok(result);
  }

  /**
   * S3에서 JSON 조회 (이미 파싱된 경우)
   */
  @Operation(
      summary = "파싱된 PDF 데이터 조회",
      description = "이미 파싱된 PDF의 JSON 데이터를 S3에서 조회하여 반환합니다. " +
          "파싱이 완료되지 않은 PDF는 조회할 수 없습니다."
  )
  @GetMapping("/{pdfId}/json")
  public ResponseEntity<Map<String, Object>> getJsonFromS3(
      @PathVariable Long pdfId,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L;
    Map<String, Object> result = pdfService.getJsonFromS3(pdfId, userId);
    return ResponseEntity.ok(result);
  }

  /**
   * CloudFront signed URL 생성 (JSON 다운로드용)
   */
  @Operation(
      summary = "JSON 파일 다운로드 URL 생성",
      description = "파싱된 JSON 파일을 다운로드할 수 있는 CloudFront Signed URL을 생성합니다. " +
          "URL은 1시간 동안 유효하며, 프론트엔드에서 직접 JSON 파일을 다운로드할 때 사용합니다."
  )
  @GetMapping("/{pdfId}/json-url")
  public ResponseEntity<Map<String, String>> getJsonDownloadUrl(
      @PathVariable Long pdfId,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L;
    String signedUrl = pdfService.generateJsonSignedUrl(pdfId, userId);
    return ResponseEntity.ok(Map.of("url", signedUrl));
  }
}