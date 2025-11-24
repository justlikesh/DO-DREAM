package A704.DODREAM.quiz.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StudentMaterialStatsDto {
	private Long materialId;
	private String materialTitle; // (추가) 자료 제목 (예: "1단원 모의고사")
	private int correctCount;     // 맞춘 개수
	private int tryCount;         // 시도한 개수 (로그 수)
	private int totalQuizCount;   // 해당 자료의 전체 퀴즈 개수
	private double correctRate;   // 정답률 (%)
}
