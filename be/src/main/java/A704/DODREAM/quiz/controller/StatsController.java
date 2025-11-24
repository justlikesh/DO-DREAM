package A704.DODREAM.quiz.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import A704.DODREAM.quiz.dto.StudentMaterialStatsDto;
import A704.DODREAM.quiz.dto.StudentOverallStatsDto;
import A704.DODREAM.quiz.service.QuizService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Stats API", description = "학생 퀴즈 성적 통계 API")
@RestController
@RequestMapping("/api/stats") // URL Prefix 변경
@RequiredArgsConstructor
public class StatsController {

	private final QuizService quizService;

	@Operation(summary = "학생의 자료별 성적 리스트 조회", description = "특정 학생이 푼 모든 자료들의 성적(맞춘 개수, 정답률)을 리스트로 조회합니다.")
	@GetMapping("/student/{studentId}/materials")
	public ResponseEntity<List<StudentMaterialStatsDto>> getStudentStatsByMaterialList(
		@PathVariable Long studentId
	) {
		return ResponseEntity.ok(quizService.getStudentStatsByMaterialList(studentId));
	}

	@Operation(summary = "학생의 종합 평균 정답률 조회", description = "학생의 모든 학습 자료에 대한 평균 정답률을 조회합니다.")
	@GetMapping("/student/{studentId}/overall")
	public ResponseEntity<StudentOverallStatsDto> getStudentOverallStats(
		@PathVariable Long studentId
	) {
		return ResponseEntity.ok(quizService.getStudentOverallStats(studentId));
	}
}
