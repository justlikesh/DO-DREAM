package A704.DODREAM.progress.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import A704.DODREAM.material.entity.Material;
import A704.DODREAM.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "student_material_progresses",
		indexes = {
				@Index(name = "idx_student", columnList = "student_id")
		},
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_progress", columnNames = {"student_id", "material_id"})  // 22번째 줄
		}
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class StudentMaterialProgress {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "student_id", nullable = false)
	private User student;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "material_id", nullable = false)
	private Material material;

	@Column(name = "current_page")
	@Builder.Default
	private Integer currentPage = 1;  // 47번째 줄: 현재 읽는 페이지

	@Column(name = "total_pages")
	private Integer totalPages;

	@Column(name = "progress_percentage")
	@Builder.Default
	private Integer progressPercentage = 0;  // 0~100

	@LastModifiedDate
	@Column(name = "last_accessed_at")
	private LocalDateTime lastAccessedAt;

	@Column(name = "completed_at")
	private LocalDateTime completedAt;

	public void updateProgress(int page) {
		// 진행률은 항상 최대값으로 저장 (뒤로 가더라도 진행률이 줄어들지 않음)
		if (page > this.currentPage) {
			this.currentPage = page;
		}

		// progressPercentage는 DB에 저장하지 않음 - API에서 실시간 계산
		// completedAt만 체크
		if (this.totalPages != null && this.currentPage >= this.totalPages && this.completedAt == null) {
			this.completedAt = LocalDateTime.now();
		}
	}

	/**
	 * totalPages 업데이트 (진행률은 재계산하지 않음 - API에서 실시간 계산)
	 */
	public void updateTotalPages(int totalPages) {
		this.totalPages = totalPages;
		
		// completedAt 체크만 수행
		if (this.currentPage != null && this.currentPage >= this.totalPages && this.completedAt == null) {
			this.completedAt = LocalDateTime.now();
		}
	}
}