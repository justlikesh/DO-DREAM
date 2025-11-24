package A704.DODREAM.quiz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizSaveDto {

	@JsonProperty("question_number")
	private Integer questionNumber;

	@JsonProperty("question_type")
	private String questionType;

	private String title;

	private String content;

	@JsonProperty("correct_answer")
	private String correctAnswer;

	@JsonProperty("chapter_reference")
	private String chapterReference;
}
