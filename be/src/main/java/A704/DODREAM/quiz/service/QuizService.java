package A704.DODREAM.quiz.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.repository.MaterialRepository;
import A704.DODREAM.quiz.dto.GradingResultDto;
import A704.DODREAM.quiz.dto.QuizDto;
import A704.DODREAM.quiz.dto.QuizSaveDto;
import A704.DODREAM.quiz.dto.QuizSubmissionDto;
import A704.DODREAM.quiz.entity.Quiz;
import A704.DODREAM.quiz.entity.StudentQuizLog;
import A704.DODREAM.quiz.repository.QuizRepository;
import A704.DODREAM.quiz.repository.StudentQuizLogRepository;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class QuizService {

	private final QuizRepository quizRepository;
	private final StudentQuizLogRepository studentQuizLogRepository;
	private final MaterialRepository materialRepository;
	private final UserRepository userRepository;
	private final WebClient webClient;

	@Value("${fastapi.url}")
	private String fastApiUrl;

	/**
	 * 교사가 검토한 퀴즈 리스트를 최종 저장 (기존 퀴즈 덮어쓰기)
	 */
	@Transactional
	public void saveQuizzes(Long materialId, Long userId, List<QuizSaveDto> quizDtos) { // (수정) 파라미터 타입 변경
		Material material = materialRepository.findById(materialId)
			.orElseThrow(() -> new CustomException(ErrorCode.FILE_NOT_FOUND));

		// 권한 체크
		if (!material.getTeacher().getId().equals(userId)) {
			throw new CustomException(ErrorCode.FORBIDDEN);
		}

		// 기존 퀴즈 삭제
		quizRepository.deleteAllByMaterialId(materialId);

		// (수정) QuizSaveDto -> Quiz Entity 변환
		List<Quiz> quizzes = quizDtos.stream()
			.map(dto -> Quiz.builder()
				.material(material)
				.questionNumber(dto.getQuestionNumber())
				.questionType(dto.getQuestionType())
				.title(dto.getTitle())
				.content(dto.getContent())
				.correctAnswer(dto.getCorrectAnswer())
				.chapterReference(dto.getChapterReference())
				.build())
			.collect(Collectors.toList());

		quizRepository.saveAll(quizzes);
		log.info("✅ 퀴즈 저장 완료: Material ID {}, 개수 {}", materialId, quizzes.size());
	}

	/**
	 * 특정 자료의 퀴즈 목록 조회 (학생/교사 공용)
	 */
	@Transactional(readOnly = true)
	public List<QuizDto> getQuizzes(Long materialId) {
		return quizRepository.findAllByMaterialIdOrderByQuestionNumber(materialId)
			.stream()
			.map(QuizDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 학생 답안 일괄 채점 및 로그 저장
	 */
	@Transactional
	public List<GradingResultDto> gradeAndLog(Long materialId, Long studentId, QuizSubmissionDto submission, String token) {
		User student = userRepository.findById(studentId)
			.orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

		// 1. DB에서 해당 자료의 정답 데이터 조회
		List<Quiz> quizzes = quizRepository.findAllByMaterialIdOrderByQuestionNumber(materialId);
		Map<Long, Quiz> quizMap = quizzes.stream()
			.collect(Collectors.toMap(Quiz::getId, q -> q));

		// 2. FastAPI 요청 바디 생성
		// Python의 grade_quiz_answers 함수 시그니처에 맞게 데이터 구성
		List<Map<String, Object>> questionList = quizzes.stream()
			.map(q -> Map.<String, Object>of(
				"id", q.getId(),
				"content", q.getContent(),
				"correct_answer", q.getCorrectAnswer()
			))
			.collect(Collectors.toList());

		List<Map<String, Object>> studentAnswerList = submission.getAnswers().stream()
			.map(ans -> Map.<String, Object>of(
				"question_id", ans.getQuizId(),
				"student_answer", ans.getAnswer()
			))
			.collect(Collectors.toList());

		Map<String, Object> fastApiRequest = Map.of(
			"questions", questionList,
			"student_answers", studentAnswerList
		);

		// 3. FastAPI 채점 요청 (일괄 채점)
		log.info("🤖 FastAPI 채점 요청 중... 학생 ID: {}", studentId);
		List<GradingResultDto> results = webClient.post()
			.uri(fastApiUrl + "/rag/quiz/grade-batch") // (주의) FastAPI에 이 엔드포인트 추가 필요
			.header("Authorization", token)
			.bodyValue(fastApiRequest)
			.retrieve()
			.bodyToMono(new ParameterizedTypeReference<List<GradingResultDto>>() {})
			.block();

		if (results == null) {
			throw new RuntimeException("FastAPI 채점 응답이 비어있습니다.");
		}

		// 4. 채점 결과 DB 저장 (Log)
		List<StudentQuizLog> logs = results.stream().map(res -> {
			Quiz quiz = quizMap.get(res.getQuizId());
			return StudentQuizLog.builder()
				.quiz(quiz)
				.student(student)
				.studentAnswer(res.getStudentAnswer())
				.isCorrect(res.isCorrect())
				.aiFeedback(res.getAiFeedback())
				.build();
		}).collect(Collectors.toList());

		studentQuizLogRepository.saveAll(logs);
		log.info("✅ 채점 및 로그 저장 완료: {}건", logs.size());

		return results;
	}

	/**
	 * 학생 퀴즈 풀이 기록 조회
	 */
	@Transactional(readOnly = true)
	public List<GradingResultDto> getStudentLogs(Long materialId, Long studentId) {
		return studentQuizLogRepository.findByStudentIdAndQuizMaterialId(studentId, materialId).stream()
			.map(log -> GradingResultDto.builder()
				.quizId(log.getQuiz().getId())
				.studentAnswer(log.getStudentAnswer())
				.isCorrect(log.isCorrect())
				.aiFeedback(log.getAiFeedback())
				.build())
			.collect(Collectors.toList());
	}
}