package A704.DODREAM.quiz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import A704.DODREAM.quiz.entity.Quiz;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuizDto {
	private Long id; // 생성 시엔 null, 조회 시엔 존재
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

	public static QuizDto from(Quiz quiz) {
		return QuizDto.builder()
			.id(quiz.getId())
			.questionNumber(quiz.getQuestionNumber())
			.questionType(quiz.getQuestionType())
			.title(quiz.getTitle())
			.content(quiz.getContent())
			.correctAnswer(quiz.getCorrectAnswer())
			.chapterReference(quiz.getChapterReference())
			.build();
	}
}