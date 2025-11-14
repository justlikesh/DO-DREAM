import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  findNodeHandle,
  LayoutChangeEvent,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  PlayerScreenNavigationProp,
  PlayerScreenRouteProp,
} from "../../navigation/navigationTypes";
import { getChapterById } from "../../data/dummyChapters";
import { getQuizzesByChapterId } from "../../data/dummyQuizzes";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../../triggers/TriggerContext";
import ttsService from "../../services/ttsService";
import {
  saveProgress,
  savePlayerPosition,
  getPlayerPosition,
} from "../../services/appStorage";
import { LocalProgress } from "../../types/progress";
import { PlayMode } from "../../types/playMode";
import {
  createBookmark,
  isBookmarked,
  getBookmarkIdBySection,
  deleteBookmark,
} from "../../services/bookmarkStorage";
import { useAppSettingsStore } from "../../stores/appSettingsStore";
import PlayerSettingsModal from "../../components/PlayerSettingsModal";

type PlayModeKey = "single" | "continuous" | "repeat";

const UI_MODE_LABELS: Record<PlayModeKey, string> = {
  continuous: "연속",
  repeat: "반복",
  single: "1개",
};

export default function PlayerScreen() {
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const route = useRoute<PlayerScreenRouteProp>();
  const { material, chapterId, fromStart } = route.params;

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const appSettings = useAppSettingsStore((state) => state.settings);

  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const [isChapterCompleted, setIsChapterCompleted] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("single");
  const [bookmarked, setBookmarked] = useState(false);
  const { setMode, registerPlayPause } = useContext(TriggerContext);

  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const playButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const prevButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const nextButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const isInitialMount = useRef(true);

  // Modal 상태
  const [modalVisible, setModalVisible] = useState(false);
  const wasPlayingBeforeModal = useRef(false);

  const [controlsHeight, setControlsHeight] = useState(0);
  const onControlsLayout = (e: LayoutChangeEvent) =>
    setControlsHeight(e.nativeEvent.layout.height);

  const chapter = getChapterById(chapterId);
  const quizzes = getQuizzesByChapterId(chapterId.toString());
  const hasQuiz = quizzes.length > 0;

  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 스크린리더 상태 추적
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then(
      (enabled) => mounted && setScreenReaderEnabled(enabled)
    );
    const sub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => setScreenReaderEnabled(enabled)
    );
    return () => {
      // @ts-ignore
      sub?.remove?.();
    };
  }, []);

  // TTS 실제 재생 상태 폴링
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const actuallyPlaying = await ttsService.isSpeaking();
        const status = ttsService.getStatus();

        if (actuallyPlaying !== isPlayingRef.current) {
          console.log(
            `[PlayerScreen] 상태 동기화: UI=${isPlayingRef.current} -> 실제=${actuallyPlaying}`
          );
          setIsPlaying(actuallyPlaying);
        }

        if (!actuallyPlaying && status === "idle" && isPlayingRef.current) {
          console.log("[PlayerScreen] TTS 정지 감지, UI 상태 업데이트");
          setIsPlaying(false);
        }
      } catch (error) {
        // 폴링 에러 무시
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, []);

  // 저장(북마크) 상태 동기화
  useEffect(() => {
    if (!chapter) return;
    const isCurrentBookmarked = isBookmarked(
      material.id.toString(),
      chapterId,
      currentSectionIndex
    );
    setBookmarked(isCurrentBookmarked);
  }, [currentSectionIndex, material.id, chapterId, chapter]);

  // 자동 재생 보장 로직 (TalkBack OFF + 연속재생 모드에서만 사용)
  const ensureAutoPlay = useCallback(async (delayMs: number) => {
    setTimeout(async () => {
      try {
        const status = ttsService.getStatus();
        console.log(`[PlayerScreen] 자동재생 시도: status=${status}`);

        const speaking = await ttsService.isSpeaking();
        if (speaking) {
          console.log("[PlayerScreen] 이미 재생 중");
          setIsPlaying(true);
          return;
        }

        if (status === "idle" || status === "stopped" || status === "paused") {
          let retryCount = 0;
          const maxRetries = 3;
          let playSuccess = false;

          while (retryCount < maxRetries && !playSuccess) {
            if (retryCount > 0) {
              await new Promise((r) => setTimeout(r, 500));
            }

            try {
              console.log(
                `[PlayerScreen] 자동재생 시도 ${retryCount + 1}/${maxRetries}`
              );

              await ttsService.play();

              await new Promise((r) => setTimeout(r, 1000));

              const actuallyPlaying = await ttsService.isSpeaking();
              console.log(`[PlayerScreen] 재생 확인: ${actuallyPlaying}`);

              if (actuallyPlaying) {
                playSuccess = true;
                setIsPlaying(true);
                console.log("[PlayerScreen] ✓ 자동재생 성공");
                return;
              }
            } catch (error) {
              console.error(
                `[PlayerScreen] 재생 시도 ${retryCount + 1} 실패:`,
                error
              );
            }

            retryCount++;
          }

          if (!playSuccess) {
            console.warn("[PlayerScreen] ✗ 자동재생 실패 - 모든 재시도 소진");
            setIsPlaying(false);
          }
        }
      } catch (error) {
        console.error("[PlayerScreen] 자동재생 오류:", error);
        setIsPlaying(false);
      }
    }, delayMs);
  }, []);

  // 재생/일시정지 핸들러 (ref 기반)
  const isHandlingPlayPause = useRef(false);
  const pendingPlayPauseRequest = useRef(false);

  const handlePlayPause = useCallback(async () => {
    if (isHandlingPlayPause.current) {
      console.log("[PlayerScreen] 재생/일시정지 처리 중... 요청 큐잉");
      pendingPlayPauseRequest.current = true;
      return;
    }

    isHandlingPlayPause.current = true;
    const uiPlaying = isPlayingRef.current;
    console.log(`[PlayerScreen] 재생/일시정지 시작: UI상태=${uiPlaying}`);

    try {
      const actualStatus = ttsService.getStatus();
      const actuallyPlaying = await ttsService.isSpeaking();

      console.log(
        `[PlayerScreen] TTS 실제 상태: status=${actualStatus}, playing=${actuallyPlaying}`
      );

      const shouldPause = actuallyPlaying || uiPlaying;

      if (shouldPause) {
        await ttsService.pause();
        await new Promise((r) => setTimeout(r, 150));
        setIsPlaying(false);
        Haptics.selectionAsync();
        console.log("[PlayerScreen] ✓ 일시정지 완료");
      } else {
        console.log("[PlayerScreen] 재생 시작...");

        if (actualStatus === "paused") {
          await ttsService.resume();
        } else {
          await ttsService.play();
        }

        await new Promise((r) => setTimeout(r, 600));

        const nowPlaying = await ttsService.isSpeaking();

        if (nowPlaying) {
          setIsPlaying(true);
          Haptics.selectionAsync();
          console.log("[PlayerScreen] ✓ 재생 성공");
        } else {
          console.warn("[PlayerScreen] 재생 실패, 1회 재시도...");
          await ttsService.stop();
          await new Promise((r) => setTimeout(r, 200));
          await ttsService.play();
          await new Promise((r) => setTimeout(r, 600));

          const retryPlaying = await ttsService.isSpeaking();
          setIsPlaying(retryPlaying);

          if (retryPlaying) {
            Haptics.selectionAsync();
            console.log("[PlayerScreen] ✓ 재시도 재생 성공");
          } else {
            console.error("[PlayerScreen] ✗ 재시도 재생 실패");
          }
        }
      }
    } catch (error) {
      console.error("[PlayerScreen] 재생/일시정지 오류:", error);
      setIsPlaying(false);
    } finally {
      isHandlingPlayPause.current = false;

      if (pendingPlayPauseRequest.current) {
        pendingPlayPauseRequest.current = false;
        console.log("[PlayerScreen] 큐잉된 요청 처리");
        setTimeout(() => handlePlayPause(), 100);
      }
    }
  }, []);

  // 트리거 등록/해제
  useEffect(() => {
    setMode("playpause");
    registerPlayPause(handlePlayPause);

    return () => {
      console.log("[PlayerScreen] useEffect cleanup 시작");
      registerPlayPause(null);
      setMode("voice");

      ttsService.stop();

      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current);
      }

      console.log("[PlayerScreen] useEffect cleanup 완료");
    };
  }, [setMode, registerPlayPause, handlePlayPause]);

  // 진행률 저장 (명시적 섹션 인덱스 전달)
  const saveProgressData = useCallback(
    (
      isCompleted: boolean,
      sectionIndex?: number,
      playModeOverride?: PlayMode
    ) => {
      if (!chapter) return;

      const sectionIndexToSave =
        sectionIndex !== undefined
          ? sectionIndex
          : ttsService.getCurrentSectionIndex();
      const playModeToSave = playModeOverride ?? ttsService.getPlayMode();

      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current);
      }

      const materialId = material.id.toString();
      const now = new Date().toISOString();

      progressSaveTimerRef.current = setTimeout(() => {
        const localProgress: LocalProgress = {
          materialId,
          chapterId,
          lastAccessedAt: now,
          currentSectionIndex: sectionIndexToSave,
          isCompleted,
        };
        saveProgress(localProgress);
        savePlayerPosition({
          materialId,
          chapterId,
          sectionIndex: sectionIndexToSave,
          playMode: playModeToSave,
          lastAccessedAt: now,
        });
        console.log("[AppStorage] Player position saved:", {
          materialId,
          chapterId,
          sectionIndex: sectionIndexToSave,
          playMode: playModeToSave,
        });
      }, 800);
    },
    [material.id, chapterId, chapter]
  );

  // 초기화 + 자동재생
  useEffect(() => {
    if (!chapter) return;

    const savedPosition = getPlayerPosition(material.id.toString(), chapterId);

    let startIndex = 0;
    let initialPlayMode: PlayMode = "single";

    if (savedPosition && !fromStart) {
      startIndex = savedPosition.sectionIndex;
      initialPlayMode = savedPosition.playMode;
      setCurrentSectionIndex(startIndex);
    }

    // 상태 및 TTS 둘 다 동일한 initialPlayMode 사용
    setPlayMode(initialPlayMode);

    ttsService.initialize(chapter.sections, startIndex, {
      rate: appSettings.ttsRate,
      pitch: appSettings.ttsPitch,
      volume: appSettings.ttsVolume,
      voice: appSettings.ttsVoiceId || undefined,
      playMode: initialPlayMode,
      onStart: () => {
        console.log("[PlayerScreen] TTS onStart 콜백");
        setIsPlaying(true);
      },
      onDone: () => {
        console.log("[PlayerScreen] TTS onDone 콜백");
        setIsPlaying(false);
        if (
          ttsService.getCurrentSectionIndex() ===
          chapter.sections.length - 1
        ) {
          setIsChapterCompleted(true);
          saveProgressData(true);
          AccessibilityInfo.announceForAccessibility(
            "챕터 학습을 완료했습니다."
          );
        }
      },
      onSectionChange: (newIndex) => {
        console.log(`[PlayerScreen] 섹션 변경: ${newIndex}`);
        setCurrentSectionIndex(newIndex);
        setTimeout(
          () => scrollViewRef.current?.scrollTo({ y: 0, animated: true }),
          50
        );
        // 섹션 변경 시 명시적으로 인덱스 전달
        saveProgressData(false, newIndex);
      },
    });

    if (isInitialMount.current) {
      isInitialMount.current = false;

      if (screenReaderEnabled) {
        // TalkBack 켜진 경우: 어떤 모드든 자동재생 없음
        console.log(
          "[PlayerScreen] TalkBack 켜짐 - 모든 모드에서 자동재생 없음 (수동 재생)"
        );
      } else if (initialPlayMode === "continuous") {
        // TalkBack OFF + 연속재생 모드일 때만 자동재생
        console.log(
          "[PlayerScreen] TalkBack 꺼짐 + 연속재생 모드 - 1초 후 자동재생"
        );
        ensureAutoPlay(1000);
      } else {
        // single / repeat 모드는 자동재생 없음
        console.log(
          `[PlayerScreen] 자동재생 없음 (초기 재생 모드: ${initialPlayMode})`
        );
      }
    }
  }, [
    chapter,
    material.id,
    chapterId,
    fromStart,
    appSettings,
    ensureAutoPlay,
    screenReaderEnabled,
    saveProgressData,
  ]);

  // TTS 설정 변경 시 동기화
  useEffect(() => {
    ttsService.setRate(appSettings.ttsRate);
    ttsService.setPitch(appSettings.ttsPitch);
    ttsService.setVolume(appSettings.ttsVolume);
    if (appSettings.ttsVoiceId) {
      ttsService.setVoice(appSettings.ttsVoiceId);
    }
  }, [
    appSettings.ttsRate,
    appSettings.ttsPitch,
    appSettings.ttsVolume,
    appSettings.ttsVoiceId,
  ]);

  // playMode 변경 시 TTS에 반영
  useEffect(() => {
    ttsService.setPlayMode(playMode);
  }, [playMode]);

  // 화면 이탈 시 TTS 완전 정지
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async () => {
      console.log("[PlayerScreen] 화면 이탈 감지 - TTS 정지");

      await ttsService.cleanup();
      setIsPlaying(false);

      saveProgressData(false);
    });

    return unsubscribe;
  }, [navigation, saveProgressData]);

  // 이전 버튼
  const handlePrevious = useCallback(async () => {
    if (currentSectionIndex > 0) {
      Haptics.selectionAsync();
      const wasPaused = !isPlayingRef.current;
      if (!wasPaused) {
        await ttsService.pause();
        setIsPlaying(false);
      }
      await new Promise((r) => setTimeout(r, 100));
      await ttsService.previous();
      const newIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(newIndex);
      if (!wasPaused) {
        await new Promise((r) => setTimeout(r, 200));
        await ttsService.play();
        setIsPlaying(true);
      }
      saveProgressData(false, newIndex);
    }
  }, [currentSectionIndex, saveProgressData]);

  // 다음 버튼
  const handleNext = useCallback(async () => {
    if (!chapter || currentSectionIndex >= chapter.sections.length - 1) return;
    Haptics.selectionAsync();
    const wasPaused = !isPlayingRef.current;
    if (!wasPaused) {
      await ttsService.pause();
      setIsPlaying(false);
    }
    await new Promise((r) => setTimeout(r, 100));
    await ttsService.next();
    const newIndex = currentSectionIndex + 1;
    setCurrentSectionIndex(newIndex);
    if (!wasPaused) {
      await new Promise((r) => setTimeout(r, 200));
      await ttsService.play();
      setIsPlaying(true);
    }
    saveProgressData(false, newIndex);
  }, [chapter, currentSectionIndex, saveProgressData]);

  // 질문하기
  const handleQuestionPress = useCallback(async () => {
    Haptics.selectionAsync();
    const wasPaused = !isPlayingRef.current;
    if (!wasPaused) {
      await ttsService.pause();
      setIsPlaying(false);
    }

    AccessibilityInfo.announceForAccessibility(
      "질문하기 화면으로 이동합니다. 음성 인식 버튼을 누른 후 질문해주세요."
    );

    setTimeout(() => {
      navigation.navigate("Question", {
        material,
        chapterId,
        sectionIndex: currentSectionIndex,
      });
    }, 300);
  }, [navigation, material, chapterId, currentSectionIndex]);

  // 더보기 버튼
  const handleOpenSettings = useCallback(async () => {
    Haptics.selectionAsync();

    wasPlayingBeforeModal.current = isPlayingRef.current;

    if (isPlayingRef.current) {
      await ttsService.pause();
      setIsPlaying(false);
    }

    setModalVisible(true);
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(async () => {
    setModalVisible(false);

    if (wasPlayingBeforeModal.current) {
      console.log("[PlayerScreen] 모달 닫힘 - 재생 재개");

      setTimeout(async () => {
        try {
          await ttsService.play();

          await new Promise((r) => setTimeout(r, 600));
          const nowPlaying = await ttsService.isSpeaking();

          if (nowPlaying) {
            setIsPlaying(true);
            console.log("[PlayerScreen] ✓ 모달 후 재생 재개 성공");
          } else {
            console.warn("[PlayerScreen] ✗ 모달 후 재생 재개 실패");
          }
        } catch (error) {
          console.error("[PlayerScreen] 모달 후 재생 재개 오류:", error);
        }
      }, 300);

      wasPlayingBeforeModal.current = false;
    }
  }, []);

  // 재생 모드 변경
  const handlePlayModeChange = useCallback(
    (newMode: PlayMode) => {
      setPlayMode(newMode);
      ttsService.setPlayMode(newMode);
      savePlayerPosition({
        materialId: material.id.toString(),
        chapterId: chapterId,
        sectionIndex: currentSectionIndex,
        playMode: newMode,
        lastAccessedAt: new Date().toISOString(),
      });
    },
    [material.id, chapterId, currentSectionIndex]
  );

  // 북마크 토글 (이제 헤더 버튼에서만 사용)
  const handleToggleBookmark = useCallback(async () => {
    if (!chapter) return;

    const currentlyBookmarked = isBookmarked(
      material.id.toString(),
      chapterId,
      currentSectionIndex
    );

    if (currentlyBookmarked) {
      const bookmarkId = getBookmarkIdBySection(
        material.id.toString(),
        chapterId,
        currentSectionIndex
      );
      if (bookmarkId) {
        deleteBookmark(bookmarkId);
        setBookmarked(false);
        AccessibilityInfo.announceForAccessibility("저장을 해제했습니다");
      }
    } else {
      const currentSection = chapter.sections[currentSectionIndex];
      const newBookmark = {
        materialId: material.id.toString(),
        chapterId: chapterId,
        sectionId: currentSection.id,
        sectionIndex: currentSectionIndex,
        sectionText: currentSection.text.substring(0, 100),
        sectionType: currentSection.type,
      };
      createBookmark(newBookmark);
      setBookmarked(true);
      AccessibilityInfo.announceForAccessibility("현재 위치를 저장했습니다");
    }
  }, [material.id, chapterId, currentSectionIndex, chapter]);

  // 뒤로가기
  const handleBackPress = useCallback(() => {
    Haptics.selectionAsync();

    Alert.alert(
      "학습 종료",
      "학습을 종료하시겠습니까? 진행 상황은 자동으로 저장됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "종료",
          onPress: () => {
            ttsService.stop();
            saveProgressData(false);
            navigation.goBack();
          },
        },
      ]
    );
  }, [navigation, saveProgressData]);

  // 챕터 완료 후 퀴즈 이동
  const handleQuizNavigation = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    ttsService.stop();
    navigation.navigate("QuizList", { material, chapterId });
  }, [navigation, material, chapterId]);

  // 초기 포커스: TalkBack 켜져 있으면 "재생 버튼"에 포커스
  useEffect(() => {
    if (!screenReaderEnabled) return;
    const timer = setTimeout(() => {
      const target = playButtonRef.current || contentRef.current;
      const reactTag = target ? findNodeHandle(target) : null;
      if (reactTag) {
        AccessibilityInfo.setAccessibilityFocus(reactTag);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [screenReaderEnabled]);

  if (!chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>챕터를 불러올 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const currentSection = chapter.sections[currentSectionIndex];
  if (!currentSection) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>섹션을 불러올 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* 헤더 - 재생 중에는 접근성에서 숨김 */}
        <View
          style={styles.header}
          accessibilityElementsHidden={isPlaying}
          importantForAccessibility={isPlaying ? "no-hide-descendants" : "yes"}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              accessible
              accessibilityLabel="뒤로가기"
              accessibilityHint="학습을 종료하고 이전 화면으로 돌아갑니다"
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>← 뒤로</Text>
            </TouchableOpacity>

            {/* 저장 버튼 */}
            <TouchableOpacity
              style={[
                styles.bookmarkHeaderButton,
                bookmarked && styles.bookmarkHeaderButtonActive,
              ]}
              onPress={handleToggleBookmark}
              accessible
              accessibilityLabel={
                bookmarked ? "저장 해제하기" : "이 위치 저장하기"
              }
              accessibilityHint={
                bookmarked
                  ? "현재 위치의 저장을 해제합니다"
                  : "현재 학습 위치를 북마크에 저장합니다"
              }
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.bookmarkHeaderButtonText,
                  bookmarked && styles.bookmarkHeaderButtonTextActive,
                ]}
              >
                {bookmarked ? "저장 해제" : "저장하기"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.subjectText}>{material.subject}</Text>
            <Text style={styles.chapterTitle}>{chapter.title}</Text>
            <Text style={styles.modeIndicator}>
              모드: {UI_MODE_LABELS[playMode]}
            </Text>
          </View>
        </View>

        {/* 학습 콘텐츠 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: controlsHeight + 20 },
          ]}
        >
          <View
            ref={contentRef}
            style={styles.contentBox}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`${chapter.title}, 섹션 ${
              currentSectionIndex + 1
            } 중 ${currentSectionIndex + 1}번째`}
          >
            <Text style={styles.contentText}>{currentSection.text}</Text>
          </View>

          <Text style={styles.counterText}>
            {currentSectionIndex + 1} / {chapter.sections.length}
          </Text>
        </ScrollView>

        {/* 재생 컨트롤 */}
        <View style={styles.controls} onLayout={onControlsLayout}>
          <TouchableOpacity
            ref={prevButtonRef}
            style={[
              styles.controlButtonPrevNext,
              currentSectionIndex === 0 && styles.disabledButton,
            ]}
            onPress={handlePrevious}
            disabled={currentSectionIndex === 0}
            accessible
            accessibilityLabel={
              currentSectionIndex === 0 ? "이전 섹션 없음" : "이전 섹션"
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: currentSectionIndex === 0 }}
          >
            <Text style={styles.controlButtonText}>← 이전</Text>
          </TouchableOpacity>

          <TouchableOpacity
            ref={playButtonRef}
            style={[styles.controlButtonPlay]}
            onPress={handlePlayPause}
            accessible
            accessibilityLabel={isPlaying ? "일시정지" : "재생"}
            accessibilityRole="button"
            accessibilityHint={
              isPlaying ? "음성을 일시정지합니다" : "음성을 재생합니다"
            }
          >
            <Text style={styles.playButtonText}>
              {isPlaying ? "일시정지" : "재생"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            ref={nextButtonRef}
            style={[
              styles.controlButtonPrevNext,
              chapter && currentSectionIndex === chapter.sections.length - 1
                ? styles.disabledButton
                : null,
            ]}
            onPress={handleNext}
            disabled={
              chapter
                ? currentSectionIndex === chapter.sections.length - 1
                : false
            }
            accessible
            accessibilityLabel={
              chapter && currentSectionIndex === chapter.sections.length - 1
                ? "다음 섹션 없음, 마지막 섹션입니다"
                : "다음 섹션"
            }
            accessibilityRole="button"
            accessibilityState={{
              disabled: chapter
                ? currentSectionIndex === chapter.sections.length - 1
                : false,
            }}
          >
            <Text style={styles.controlButtonText}>다음 →</Text>
          </TouchableOpacity>
        </View>

        {/* 하단 액션 버튼들 */}
        <View style={styles.bottomActionWrap}>
          <TouchableOpacity
            style={styles.askButton}
            onPress={handleQuestionPress}
            accessible
            accessibilityLabel="질문하기"
            accessibilityRole="button"
            accessibilityHint="음성으로 질문할 수 있는 화면으로 이동합니다"
          >
            <Text style={styles.askButtonText}>질문하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={handleOpenSettings}
            accessible
            accessibilityLabel="더보기"
            accessibilityHint="재생 모드, 속도 설정을 변경할 수 있습니다"
            accessibilityRole="button"
          >
            <Text style={styles.moreButtonText}>더보기</Text>
          </TouchableOpacity>
        </View>

        {/* 챕터 완료 시 퀴즈 안내 */}
        {isChapterCompleted && hasQuiz && (
          <View style={styles.completionOverlay}>
            <View style={styles.completionCard}>
              <Text style={styles.completionTitle}>챕터 학습 완료!</Text>
              <Text style={styles.completionMessage}>
                퀴즈로 학습 내용을 확인해보세요.
              </Text>
              <TouchableOpacity
                style={styles.quizButton}
                onPress={handleQuizNavigation}
                accessible
                accessibilityLabel="퀴즈 풀기"
                accessibilityRole="button"
              >
                <Text style={styles.quizButtonText}>퀴즈 풀기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  setIsChapterCompleted(false);
                  navigation.goBack();
                }}
                accessible
                accessibilityLabel="나중에 하기"
                accessibilityRole="button"
              >
                <Text style={styles.skipButtonText}>나중에 하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>

      <PlayerSettingsModal
        visible={modalVisible}
        currentPlayMode={playMode}
        onPlayModeChange={handlePlayModeChange}
        onClose={handleCloseModal}
      />
    </>
  );
}

const HEADER_BTN_MIN_HEIGHT = 48;
const CONTROL_BTN_MIN_HEIGHT = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 72,
    minHeight: HEADER_BTN_MIN_HEIGHT,
    justifyContent: "center",
  },
  backButtonText: { fontSize: 18, color: "#2196F3", fontWeight: "700" },
  bookmarkHeaderButton: {
    marginLeft: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#BDBDBD",
    backgroundColor: "#F6F6F6",
    minHeight: HEADER_BTN_MIN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  bookmarkHeaderButtonActive: {
    borderColor: "#43A047",
    backgroundColor: "#E8F5E9",
  },
  bookmarkHeaderButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#E68A00",
  },
  bookmarkHeaderButtonTextActive: {
    color: "#1B5E20",
  },

  headerInfo: { marginTop: 4 },
  subjectText: { fontSize: 18, color: "#666666", marginBottom: 4 },
  chapterTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 6,
  },
  modeIndicator: {
    fontSize: 15,
    color: "#2196F3",
    fontWeight: "600",
  },

  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  contentBox: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },
  contentText: {
    fontSize: 28,
    lineHeight: 44,
    color: "#333",
    fontWeight: "500",
  },
  counterText: {
    fontSize: 20,
    color: "#999",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 16,
  },

  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 2,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
    gap: 12,
  },

  controlButtonPrevNext: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    minWidth: 100,
    minHeight: CONTROL_BTN_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1976D2",
  },
  controlButtonText: { fontSize: 20, fontWeight: "800", color: "#ffffff" },

  controlButtonPlay: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#4CAF50",
    minWidth: 130,
    minHeight: CONTROL_BTN_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#388E3C",
  },
  playButtonText: { fontSize: 22, fontWeight: "900", color: "#ffffff" },

  disabledButton: {
    backgroundColor: "#BDBDBD",
    borderColor: "#9E9E9E",
    opacity: 0.6,
  },

  bottomActionWrap: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    gap: 12,
  },
  askButton: {
    backgroundColor: "#FF9500",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 72,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#E68A00",
  },
  askButtonText: { fontSize: 24, fontWeight: "bold", color: "#FFFFFF" },

  moreButton: {
    backgroundColor: "#E3F2FD",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    minHeight: 64,
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  moreButtonText: { fontSize: 20, fontWeight: "bold", color: "#0D47A1" },

  errorText: {
    fontSize: 20,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
  },

  completionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  completionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 16,
    textAlign: "center",
  },
  completionMessage: {
    fontSize: 20,
    color: "#333",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 28,
  },
  quizButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 40,
    minHeight: 72,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#388E3C",
  },
  quizButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  skipButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 64,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  skipButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
  },
});
