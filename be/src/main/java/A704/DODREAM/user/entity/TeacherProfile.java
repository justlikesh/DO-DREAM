package A704.DODREAM.user.entity;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "teacher_profiles")
@Getter
public class TeacherProfile {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private User user;
    
	private String teacherNo;

    @OneToMany(mappedBy = "teacher")
    private List<ClassroomTeacher> classroomTeachers = new ArrayList<>();

    public static TeacherProfile create(User user, String teacherNo) {
		TeacherProfile teacherProfile = new TeacherProfile();
		teacherProfile.user = user;
		teacherProfile.teacherNo = teacherNo;
		return teacherProfile;
	}
}
