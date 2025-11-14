package A704.DODREAM.bookmark.repository;

import A704.DODREAM.bookmark.entity.Bookmark;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    Optional<Bookmark> findByUserAndMaterialAndSectionId(
            User user, Material material, String sectionId
    );

    List<Bookmark> findByUserAndMaterial(User user, Material material);

    @Query("SELECT b.sectionId FROM Bookmark b " +
            "WHERE b.user = :user AND b.material =: material")
    Set<String> findSectionIdsByUserAndMaterial(
            User user, Material material
    );

    long countByUser(User user);
}
