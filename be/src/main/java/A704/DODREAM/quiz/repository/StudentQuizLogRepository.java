package A704.DODREAM.quiz.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.quiz.entity.StudentQuizLog;

public interface StudentQuizLogRepository extends JpaRepository<StudentQuizLog, Long> {
	// 특정 학생의 특정 자료에 대한 풀이 기록 조회 (퀴즈를 통해 조인)
	List<StudentQuizLog> findByStudentIdAndQuizMaterialId(Long studentId, Long materialId);

	// 교사용: 특정 자료에 대한 모든 학생의 풀이 기록
	List<StudentQuizLog> findByQuizMaterialId(Long materialId);
}