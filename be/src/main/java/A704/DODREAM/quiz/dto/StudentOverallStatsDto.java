package A704.DODREAM.quiz.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StudentOverallStatsDto {
	private Long studentId;
	private int solvedMaterialCount; // 푼 자료의 개수
	private double averageCorrectRate; // 전체 자료 평균 정답률 (%)
}