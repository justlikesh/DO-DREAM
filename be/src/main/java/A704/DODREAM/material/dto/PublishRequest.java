package A704.DODREAM.material.dto;

import A704.DODREAM.material.enums.LabelColor;
import A704.DODREAM.quiz.dto.QuizSaveDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.RequestBody;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishRequest {

    String materialTitle;
    LabelColor labelColor;
    Map<String,Object> editedJson;
	List<QuizSaveDto> quizzes;
}
