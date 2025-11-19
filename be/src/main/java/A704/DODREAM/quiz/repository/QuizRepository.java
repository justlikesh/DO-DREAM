package A704.DODREAM.quiz.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.quiz.entity.Quiz;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
	List<Quiz> findAllByMaterialIdOrderByQuestionNumber(Long materialId);

	void deleteAllByMaterialId(Long materialId);

	int countByMaterialId(Long materialId);
}
