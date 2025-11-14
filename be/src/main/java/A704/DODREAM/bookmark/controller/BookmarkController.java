package A704.DODREAM.bookmark.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.bookmark.dto.BookmarkRequest;
import A704.DODREAM.bookmark.dto.BookmarkResponse;
import A704.DODREAM.bookmark.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @PostMapping("/toggle")
    public ResponseEntity<BookmarkResponse> toggleBookmark(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody BookmarkRequest request
    )
    {
        BookmarkResponse response = bookmarkService.toggleBookmark(userPrincipal.userId(), request);
        return ResponseEntity.ok(response);
    }


}
