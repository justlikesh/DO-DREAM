package A704.DODREAM.quiz.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import A704.DODREAM.quiz.entity.StudentQuizLog;

public interface StudentQuizLogRepository extends JpaRepository<StudentQuizLog, Long> {
	// 교사용: 특정 자료에 대한 모든 학생의 풀이 기록
	List<StudentQuizLog> findByQuizMaterialId(Long materialId);

	// 특정 학생이 특정 자료에서 푼 로그 조회 (Fetch Join으로 N+1 방지)
	@Query("SELECT sql FROM StudentQuizLog sql JOIN FETCH sql.quiz q WHERE sql.student.id = :studentId AND q.material.id = :materialId")
	List<StudentQuizLog> findByStudentIdAndQuizMaterialId(@Param("studentId") Long studentId, @Param("materialId") Long materialId);

	// 특정 자료에 대한 모든 학생의 풀이 로그 조회 (통계용, User와 Quiz Fetch Join)
	@Query("SELECT sql FROM StudentQuizLog sql JOIN FETCH sql.student s JOIN FETCH sql.quiz q WHERE q.material.id = :materialId")
	List<StudentQuizLog> findAllByQuizMaterialId(@Param("materialId") Long materialId);

	// 특정 학생의 모든 풀이 로그 조회 (종합 통계용, Material 정보 필요하므로 Quiz->Material Fetch Join)
	@Query("SELECT sql FROM StudentQuizLog sql JOIN FETCH sql.quiz q JOIN FETCH q.material m WHERE sql.student.id = :studentId")
	List<StudentQuizLog> findAllByStudentIdWithMaterial(@Param("studentId") Long studentId);
}