package A704.DODREAM.quiz.dto;

import java.util.List;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class QuizSubmissionDto {
	private List<SingleAnswer> answers;

	@Getter
	@NoArgsConstructor
	public static class SingleAnswer {
		private Long quizId;
		private String answer;
	}
}
