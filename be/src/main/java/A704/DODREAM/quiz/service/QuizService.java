package A704.DODREAM.quiz.service;

import java.util.ArrayList;
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
import A704.DODREAM.quiz.dto.StudentMaterialStatsDto;
import A704.DODREAM.quiz.dto.StudentOverallStatsDto;
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

	/**
	 * [API 1 수정] 특정 학생의 '모든 자료별' 퀴즈 성적 통계 리스트 조회
	 */
	@Transactional(readOnly = true)
	public List<StudentMaterialStatsDto> getStudentStatsByMaterialList(Long studentId) {
		// 1. 학생의 모든 풀이 로그 조회 (Material 정보 포함 Fetch Join 필수)
		List<StudentQuizLog> logs = studentQuizLogRepository.findAllByStudentIdWithMaterial(studentId);

		if (logs.isEmpty()) {
			return new ArrayList<>();
		}

		// 2. 자료(Material) ID를 기준으로 로그 그룹화
		// Key: MaterialId, Value: List<StudentQuizLog>
		Map<Long, List<StudentQuizLog>> logsByMaterial = logs.stream()
			.collect(Collectors.groupingBy(log -> log.getQuiz().getMaterial().getId()));

		List<StudentMaterialStatsDto> resultList = new ArrayList<>();

		// 3. 각 자료별 통계 계산
		for (Map.Entry<Long, List<StudentQuizLog>> entry : logsByMaterial.entrySet()) {
			Long materialId = entry.getKey();
			List<StudentQuizLog> materialLogs = entry.getValue();

			// 자료 정보 추출 (로그 중 하나에서 가져옴)
			Material material = materialLogs.get(0).getQuiz().getMaterial();

			// 해당 자료의 전체 퀴즈 개수 조회 (분모)
			// (Loop 내 쿼리가 발생하지만, 학생이 푼 자료의 종류가 수백 개가 아니므로 수용 가능.
			//  성능 최적화가 필요하면 materialId 리스트로 count를 한 번에 가져오는 쿼리 작성 필요)
			int totalQuizCount = quizRepository.countByMaterialId(materialId);

			if (totalQuizCount > 0) {
				// 맞춘 개수
				long correctCount = materialLogs.stream()
					.filter(StudentQuizLog::isCorrect)
					.count();

				// 정답률 계산 (맞춘 개수 / 전체 퀴즈 개수 * 100)
				double correctRate = (double) correctCount / totalQuizCount * 100.0;

				// DTO 생성 및 추가
				resultList.add(StudentMaterialStatsDto.builder()
					.materialId(materialId)
					.materialTitle(material.getTitle()) // 자료 제목 설정
					.correctCount((int) correctCount)
					.tryCount(materialLogs.size())
					.totalQuizCount(totalQuizCount)
					.correctRate(Math.round(correctRate * 10) / 10.0) // 소수점 첫째자리 반올림
					.build());
			}
		}

		return resultList;
	}

	/**
	 * [API 2] 특정 학생의 종합 평균 정답률 조회
	 * (각 자료별 정답률을 구하고, 그 정답률들의 평균을 계산)
	 */
	@Transactional(readOnly = true)
	public StudentOverallStatsDto getStudentOverallStats(Long studentId) {
		// 1. 학생의 모든 풀이 로그 조회 (Material 정보 포함)
		List<StudentQuizLog> logs = studentQuizLogRepository.findAllByStudentIdWithMaterial(studentId);

		if (logs.isEmpty()) {
			return StudentOverallStatsDto.builder()
				.studentId(studentId)
				.solvedMaterialCount(0)
				.averageCorrectRate(0.0)
				.build();
		}

		// 2. 자료(Material) ID별로 로그 그룹화
		Map<Long, List<StudentQuizLog>> logsByMaterial = logs.stream()
			.collect(Collectors.groupingBy(log -> log.getQuiz().getMaterial().getId()));

		double sumOfRates = 0.0;
		int materialCount = 0;

		// 3. 각 자료별 정답률 계산 후 합산
		for (Long materialId : logsByMaterial.keySet()) {
			// 해당 자료의 전체 퀴즈 개수 (DB 조회)
			// (최적화 팁: 자료가 매우 많다면 loop 안에서 count 쿼리보다 미리 map으로 가져오는 것이 좋으나,
			//  일반적인 학생 학습량에서는 현재 방식도 무방함)
			int totalQuizInMaterial = quizRepository.countByMaterialId(materialId);

			if (totalQuizInMaterial > 0) {
				long correctCount = logsByMaterial.get(materialId).stream()
					.filter(StudentQuizLog::isCorrect)
					.count();

				// 자료별 정답률 = (맞춘 개수 / 해당 자료 총 퀴즈 수) * 100
				double materialRate = (double) correctCount / totalQuizInMaterial * 100.0;

				sumOfRates += materialRate;
				materialCount++;
			}
		}

		// 4. 전체 평균 정답률 (자료별 정답률의 합 / 자료 개수)
		double averageRate = materialCount > 0 ? sumOfRates / materialCount : 0.0;

		return StudentOverallStatsDto.builder()
			.studentId(studentId)
			.solvedMaterialCount(materialCount)
			.averageCorrectRate(Math.round(averageRate * 10) / 10.0)
			.build();
	}
}