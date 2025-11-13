package A704.DODREAM.material.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.material.dto.PublishRequest;
import A704.DODREAM.material.dto.PublishResponseDto;
import A704.DODREAM.material.service.PublishService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
public class PublishController {

    private final PublishService publishService;

    @PostMapping("/{pdfId}/publish")
    public ResponseEntity<PublishResponseDto> publishMaterial(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long pdfId,
            @RequestBody PublishRequest publishRequest){

        Long userId = userPrincipal.userId();

        PublishResponseDto response = publishService.publishJsonWithIds(pdfId, userId, publishRequest);

        return ResponseEntity.ok(response);
    }
}
