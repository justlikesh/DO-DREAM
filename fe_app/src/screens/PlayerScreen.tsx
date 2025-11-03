import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  findNodeHandle,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  PlayerScreenNavigationProp,
  PlayerScreenRouteProp,
} from "../navigation/navigationTypes";
import { getChapterById } from "../data/dummyChapters";
import { getQuizzesByChapterId } from "../data/dummyQuizzes";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../triggers/TriggerContext";
import ttsService from "../services/ttsService";
import { saveProgress, getProgress } from "../services/storage";
import { LocalProgress } from "../types/progress";
import { PlayMode, PlayModeLabels, PlayModeIcons } from "../types/playMode";

export default function PlayerScreen() {
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const route = useRoute<PlayerScreenRouteProp>();
  const { book, chapterId, fromStart } = route.params;

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isChapterCompleted, setIsChapterCompleted] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [playMode, setPlayMode] = useState<PlayMode>("continuous");
  const { setMode, registerPlayPause } = useContext(TriggerContext);

  // TalkBack 상태
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  // 스크롤 & 포커스
  const scrollViewRef = useRef<ScrollView>(null);
  const playButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const isInitialMount = useRef(true);

  // 하단 컨트롤 높이 → ScrollView 패딩 보정
  const [controlsHeight, setControlsHeight] = useState(0);
  const onControlsLayout = (e: LayoutChangeEvent) => {
    setControlsHeight(e.nativeEvent.layout.height);
  };

  const chapter = getChapterById(chapterId);
  const quizzes = getQuizzesByChapterId(chapterId);
  const hasQuiz = quizzes.length > 0;

  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const didAutoPlayRef = useRef(false);

  // TalkBack 상태 구독
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderEnabled(enabled);
    });
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", (enabled) =>
      setScreenReaderEnabled(enabled)
    );
    return () => {
      mounted = false;
      // RN 버전에 따라 remove 존재
      // @ts-ignore
      sub?.remove?.();
    };
  }, []);

  // 트리거 모드
  useEffect(() => {
    setMode("playpause");
    registerPlayPause(() => handlePlayPause());

    return () => {
      registerPlayPause(null);
      setMode("voice");
      ttsService.stop();
      if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
    };
  }, []);

  // 보증 재생: TalkBack 안내가 끝난 뒤 실제로 말하고 있는지 확인하고, 아니면 재생
  const ensureAutoPlay = (delayMs: number) => {
    setTimeout(async () => {
      const speaking = await ttsService.isSpeaking();
      const status = ttsService.getStatus();
      if (!speaking && status !== "playing" && status !== "paused") {
        try {
          await ttsService.play();
          setIsPlaying(true);
        } catch {}
      }
    }, delayMs);
  };

  // 초기화 + 자동재생
  useEffect(() => {
    if (!chapter) return;

    const savedProgress = getProgress(book.id, chapterId);
    let startIndex = 0;

    if (savedProgress && !fromStart) {
      startIndex = savedProgress.currentSectionIndex;
      setCurrentSectionIndex(startIndex);
    }

    ttsService.initialize(chapter.sections, startIndex, {
      rate: ttsSpeed,
      playMode: playMode,
      onStart: () => {
        setIsPlaying(true);
      },
      onDone: () => {
        setIsPlaying(false);
        if (currentSectionIndex === chapter.sections.length - 1) {
          setIsChapterCompleted(true);
          saveProgressData(true);
          AccessibilityInfo.announceForAccessibility("챕터 학습을 완료했습니다.");
        }
      },
      onSectionChange: (newIndex) => {
        setCurrentSectionIndex(newIndex);
        // 새 섹션으로 이동 시 스크롤 맨 위
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 50);

        // TalkBack 켜진 경우: 안내 음성 뒤 보증 재생
        // 끊김 최소화를 위해 약간 더 길게 대기
        ensureAutoPlay(screenReaderEnabled ? 900 : 250);
      },
      onSectionComplete: () => {
        setIsPlaying(false);
        AccessibilityInfo.announceForAccessibility("문단 완료. 다음 버튼을 눌러 계속하세요.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (error) => {
        console.error("TTS Error:", error);
        setIsPlaying(false);
        AccessibilityInfo.announceForAccessibility("음성 재생 오류가 발생했습니다");
      },
    });

    // 초기 음성 안내는 TalkBack ON 시 충돌 가능 → 생략
    if (!screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(
        `${book.subject}, ${chapter.title}. ${fromStart ? "처음부터" : savedProgress ? "이어서" : ""} 재생 시작`
      );
    }

    // 자동재생: TalkBack ON 시 더 긴 지연 후 시작
    const delay = screenReaderEnabled ? 1200 : 700;
    const autoPlayTimer = setTimeout(async () => {
      if (!didAutoPlayRef.current) {
        try {
          await ttsService.play();
          setIsPlaying(true);
          didAutoPlayRef.current = true;
        } catch {}
      }
    }, delay);

    // 초기에 버튼으로 강제 포커스 → TalkBack ON일 땐 생략 (충돌 방지)
    if (isInitialMount.current && !screenReaderEnabled) {
      setTimeout(() => {
        if (playButtonRef.current) {
          const reactTag = findNodeHandle(playButtonRef.current);
          if (reactTag) AccessibilityInfo.setAccessibilityFocus(reactTag);
        }
      }, 100);
      isInitialMount.current = false;
    }

    return () => clearTimeout(autoPlayTimer);
  }, [chapter, book.id, chapterId, fromStart, ttsSpeed, playMode, screenReaderEnabled]);

  // 진행도 저장(디바운스)
  useEffect(() => {
    if (!chapter) return;
    if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
    progressSaveTimerRef.current = setTimeout(() => {
      saveProgressData(false);
    }, 2000);
  }, [currentSectionIndex, chapter]);

  // 챕터 완료 여부
  useEffect(() => {
    if (chapter && currentSectionIndex === chapter.sections.length - 1) {
      setIsChapterCompleted(true);
    } else {
      setIsChapterCompleted(false);
    }
  }, [currentSectionIndex, chapter]);

  const saveProgressData = (isCompleted: boolean) => {
    if (!chapter) return;
    const progress: LocalProgress = {
      materialId: book.id,
      chapterId: chapterId,
      currentSectionIndex,
      lastAccessedAt: new Date().toISOString(),
      isCompleted,
    };
    saveProgress(progress);
  };

  const handleGoBack = () => {
    saveProgressData(false);
    ttsService.stop();
    AccessibilityInfo.announceForAccessibility("이전 화면으로 돌아갑니다");
    navigation.goBack();
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await ttsService.pause();
      setIsPlaying(false);
      AccessibilityInfo.announceForAccessibility("일시정지");
      Haptics.selectionAsync();
    } else {
      await ttsService.play();
      setIsPlaying(true);
      AccessibilityInfo.announceForAccessibility("재생");
      Haptics.selectionAsync();
    }
  };

  const handlePrevious = async () => {
    if (currentSectionIndex > 0) {
      const newIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(newIndex);
      await ttsService.previous(); // onSectionChange에서 보증 재생
      AccessibilityInfo.announceForAccessibility(`${newIndex + 1}번째 문단으로 이동`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = async () => {
    if (chapter && currentSectionIndex < chapter.sections.length - 1) {
      const newIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(newIndex);
      await ttsService.next(); // onSectionChange에서 보증 재생
      AccessibilityInfo.announceForAccessibility(`${newIndex + 1}번째 문단으로 이동`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (chapter && currentSectionIndex === chapter.sections.length - 1) {
      if (hasQuiz) {
        AccessibilityInfo.announceForAccessibility("챕터를 완료했습니다. 아래 퀴즈 버튼을 눌러보세요.");
      } else {
        AccessibilityInfo.announceForAccessibility("챕터를 완료했습니다.");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      saveProgressData(true);
    }
  };

  // 속도 변경 (조절 제스처 지원은 이전 답변과 동일)
  const speedSteps = [0.8, 1.0, 1.2, 1.5] as const;
  const changeSpeedTo = async (nextSpeed: (typeof speedSteps)[number]) => {
    const wasPlaying = isPlaying;
    await ttsService.setRate(nextSpeed);
    setTtsSpeed(nextSpeed);
    if (wasPlaying) {
      // setRate 내부에서 동일 섹션 재시작 처리됨
      ensureAutoPlay(screenReaderEnabled ? 700 : 150);
    }
    AccessibilityInfo.announceForAccessibility(`재생 속도 ${nextSpeed}배`);
    Haptics.selectionAsync();
  };

  const handleSpeedChangePress = async () => {
    const idx = speedSteps.indexOf(ttsSpeed as (typeof speedSteps)[number]);
    const next = speedSteps[(idx + 1) % speedSteps.length];
    await changeSpeedTo(next);
  };

  const handlePlayModeChange = () => {
    const modes: PlayMode[] = ["continuous", "single", "repeat"];
    const nextMode = modes[(modes.indexOf(playMode) + 1) % modes.length];
    setPlayMode(nextMode);
    ttsService.setPlayMode(nextMode, 2);
    AccessibilityInfo.announceForAccessibility(`${PlayModeLabels[nextMode]} 모드로 변경되었습니다`);
    Haptics.selectionAsync();
  };

  const handleQuestionPress = () => {
    ttsService.pause();
    AccessibilityInfo.announceForAccessibility("질문하기 화면으로 이동합니다");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate("Question");
  };

  const handleQuizPress = () => {
    ttsService.stop();
    if (quizzes.length === 1) {
      AccessibilityInfo.announceForAccessibility("퀴즈를 시작합니다");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Quiz", { quiz: quizzes[0] });
    } else {
      AccessibilityInfo.announceForAccessibility("퀴즈 목록으로 이동합니다");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("QuizList", { book, chapterId });
    }
  };

  if (!chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>챕터를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const currentSection = chapter.sections[currentSectionIndex];
  const dynamicContentContainer = [
    styles.contentContainer,
    { paddingBottom: Math.max(24, controlsHeight + 24) },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={handleGoBack}
            accessible={true}
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            accessibilityHint="이전 화면으로 돌아갑니다"
            style={styles.backButton}
          >
            <Text importantForAccessibility="no" style={styles.backButtonText}>
              ← 뒤로
            </Text>
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={handlePlayModeChange}
              accessible={true}
              accessibilityLabel={`학습 모드 변경. 현재 ${PlayModeLabels[playMode]}`}
              accessibilityRole="button"
              accessibilityHint="연속 재생, 한 섹션씩, 반복 재생 모드를 전환합니다"
              style={styles.modeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text importantForAccessibility="no" style={styles.modeButtonText}>
                {PlayModeIcons[playMode]}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSpeedChangePress}
              accessible={true}
              accessibilityLabel={`재생 속도 변경. 현재 ${ttsSpeed}배속`}
              accessibilityRole="adjustable"
              accessibilityHint="위아래로 스와이프하여 속도를 변경할 수도 있습니다"
              accessibilityActions={[
                { name: "increment", label: "속도 올리기" },
                { name: "decrement", label: "속도 내리기" },
              ]}
              onAccessibilityAction={(e) => {
                const idx = speedSteps.indexOf(ttsSpeed as (typeof speedSteps)[number]);
                if (e.nativeEvent.actionName === "increment") {
                  const next = speedSteps[(idx + 1) % speedSteps.length];
                  changeSpeedTo(next);
                } else if (e.nativeEvent.actionName === "decrement") {
                  const next = speedSteps[(idx - 1 + speedSteps.length) % speedSteps.length];
                  changeSpeedTo(next);
                }
              }}
              style={styles.speedButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text importantForAccessibility="no" style={styles.speedButtonText}>
                ⚡ {ttsSpeed}x
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 챕터 정보 */}
        <View style={styles.headerInfo}>
          <Text style={styles.subjectText}>{book.subject}</Text>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
          <Text style={styles.modeIndicator}>
            {PlayModeIcons[playMode]} {PlayModeLabels[playMode]}
          </Text>
        </View>
      </View>

      {/* 내용 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.contentArea}
        contentContainerStyle={dynamicContentContainer}
      >
        <View style={styles.contentTextContainer}>
          <Text style={styles.contentText}>{currentSection.text}</Text>
        </View>

        <Text style={styles.progressText}>
          {currentSectionIndex + 1} / {chapter.sections.length}
        </Text>

        {isChapterCompleted && hasQuiz && (
          <View style={styles.completionSection}>
            <Text style={styles.completionText}>🎉 챕터 학습 완료!</Text>
            <TouchableOpacity
              style={styles.completionQuizButton}
              onPress={handleQuizPress}
              accessible={true}
              accessibilityLabel="퀴즈 풀기"
              accessibilityRole="button"
              accessibilityHint="학습한 내용을 확인하는 퀴즈를 풉니다"
            >
              <Text style={styles.completionQuizButtonText}>📝 퀴즈 풀기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 컨트롤 */}
      <View style={styles.controlsContainer} onLayout={onControlsLayout}>
        <TouchableOpacity
          style={[styles.controlButton, currentSectionIndex === 0 && styles.disabledButton]}
          onPress={handlePrevious}
          disabled={currentSectionIndex === 0}
          accessible={true}
          accessibilityLabel={
            currentSectionIndex === 0 ? "이전 문단 없음" : `이전 문단. ${currentSectionIndex}번째 문단으로 이동`
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: currentSectionIndex === 0 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text importantForAccessibility="no" style={styles.controlButtonText}>
            ◀ 이전
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          ref={playButtonRef}
          style={[styles.controlButton, styles.playButton]}
          onPress={handlePlayPause}
          accessible={true}
          accessibilityLabel={isPlaying ? "일시정지" : "재생"}
          accessibilityRole="button"
          accessibilityHint="두 손가락으로 두 번 탭해도 제어할 수 있습니다"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text importantForAccessibility="no" style={styles.playButtonText}>
            {isPlaying ? "⏸" : "▶"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            chapter && currentSectionIndex === chapter.sections.length - 1 ? styles.disabledButton : null,
          ]}
          onPress={handleNext}
          disabled={chapter ? currentSectionIndex === chapter.sections.length - 1 : false}
          accessible={true}
          accessibilityLabel={
            chapter && currentSectionIndex === chapter.sections.length - 1
              ? "다음 문단 없음. 마지막 문단입니다"
              : `다음 문단. ${currentSectionIndex + 2}번째 문단으로 이동`
          }
          accessibilityRole="button"
          accessibilityState={{
            disabled: chapter ? currentSectionIndex === chapter.sections.length - 1 : false,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text importantForAccessibility="no" style={styles.controlButtonText}>
            다음 ▶
          </Text>
        </TouchableOpacity>
      </View>

      {/* 하단 질문하기 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.voiceQueryButton}
          onPress={handleQuestionPress}
          accessible={true}
          accessibilityLabel="질문하기"
          accessibilityRole="button"
          accessibilityHint="음성으로 질문할 수 있는 화면으로 이동합니다"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text importantForAccessibility="no" style={styles.voiceQueryText}>
            🎤 질문하기
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  backButton: { paddingVertical: 8, paddingHorizontal: 4, minWidth: 70, minHeight: 44 },
  backButtonText: { fontSize: 18, color: "#2196F3", fontWeight: "600" },
  headerButtons: { flexDirection: "row", gap: 8 },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2196F3",
    minWidth: 52,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonText: { fontSize: 26 },
  speedButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FF9800",
    minWidth: 68,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  speedButtonText: { fontSize: 17, color: "#F57C00", fontWeight: "bold" },
  headerInfo: { marginTop: 4 },
  subjectText: { fontSize: 18, color: "#666666", marginBottom: 4 },
  chapterTitle: { fontSize: 24, fontWeight: "bold", color: "#333333", marginBottom: 6 },
  modeIndicator: { fontSize: 15, color: "#2196F3", fontWeight: "600" },
  contentArea: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  contentTextContainer: { padding: 16, borderRadius: 12, marginBottom: 20 },
  contentText: { fontSize: 26, lineHeight: 42, color: "#333333", fontWeight: "500" },
  progressText: { fontSize: 20, color: "#999999", textAlign: "center", fontWeight: "600", marginBottom: 16 },
  completionSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#4CAF50",
    alignItems: "center",
  },
  completionText: { fontSize: 24, fontWeight: "bold", color: "#2E7D32", marginBottom: 16, textAlign: "center" },
  completionQuizButton: {
    backgroundColor: "#9C27B0",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 80,
    width: "100%",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#7B1FA2",
  },
  completionQuizButtonText: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  controlButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    minWidth: 100,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1976D2",
  },
  disabledButton: { backgroundColor: "#BDBDBD", borderColor: "#9E9E9E", opacity: 0.6 },
  controlButtonText: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  playButton: { backgroundColor: "#4CAF50", minWidth: 120, minHeight: 88, borderColor: "#388E3C" },
  playButtonText: { fontSize: 40, color: "#ffffff" },
  bottomButtons: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  voiceQueryButton: {
    backgroundColor: "#FF9800",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#F57C00",
  },
  voiceQueryText: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
});
