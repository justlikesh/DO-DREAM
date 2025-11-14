import React, { useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  PlaybackChoiceScreenNavigationProp,
  PlaybackChoiceScreenRouteProp,
} from "../../navigation/navigationTypes";
import { getChaptersByMaterialId } from "../../data/dummyChapters";
import { getQuizzesByChapterId } from "../../data/dummyQuizzes";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../../triggers/TriggerContext";

export default function PlaybackChoiceScreen() {
  const navigation = useNavigation<PlaybackChoiceScreenNavigationProp>();
  const route = useRoute<PlaybackChoiceScreenRouteProp>();
  const { material } = route.params;

  const chapters = getChaptersByMaterialId(material.id.toString());
  const firstChapter = chapters[0];

  // 학습 진도가 1번 이상 있는지 확인 (hasProgress가 true면 최소 1번은 학습함)
  const hasStudied = material.hasProgress;

  // 첫 번째 챕터의 퀴즈 가져오기
  const quizzes = firstChapter
    ? getQuizzesByChapterId(firstChapter.chapterId.toString())
    : [];
  const hasQuiz = quizzes.length > 0;
  const showQuizButton = hasStudied && hasQuiz;

  // 전역 음성 명령
  const {
    setCurrentScreenId,
    registerVoiceHandlers,
    startVoiceCommandListening,
    isVoiceCommandListening,
  } = useContext(TriggerContext);

  useEffect(() => {
    const announcement = `${material.title}, ${material.currentChapter}챕터. 이어듣기, 처음부터, 저장 목록, 질문 목록, 퀴즈 중 선택하세요. 상단의 음성 명령 버튼을 두 번 탭하고, 이어서 듣기, 처음부터, 저장 목록, 질문 목록, 퀴즈 풀기, 뒤로 가기처럼 말할 수 있습니다.`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [material.title, material.currentChapter]);

  const handleFromStart = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("처음부터 시작합니다.");

    if (firstChapter) {
      navigation.navigate("Player", {
        material,
        chapterId: firstChapter.chapterId,
        fromStart: true,
      });
    }
  }, [firstChapter, material, navigation]);

  const handleContinue = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("이어서 듣기 시작합니다.");

    if (firstChapter) {
      navigation.navigate("Player", {
        material,
        chapterId: firstChapter.chapterId,
        fromStart: false,
      });
    }
  }, [firstChapter, material, navigation]);

  const handleBookmarkPress = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("저장 목록으로 이동합니다");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: 북마크 목록 화면으로 이동
    // navigation.navigate('BookmarkList', { material });
  }, []);

  const handleQuestionPress = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("질문 목록으로 이동합니다");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: 질문 목록 화면으로 이동
    // navigation.navigate('QuestionList', { material });
  }, []);

  const handleQuizPress = useCallback(() => {
    if (!firstChapter) return;

    if (quizzes.length === 1) {
      // 퀴즈가 1개면 바로 퀴즈 화면으로
      AccessibilityInfo.announceForAccessibility("퀴즈를 시작합니다");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Quiz", { quiz: quizzes[0] });
    } else {
      // 퀴즈가 여러 개면 퀴즈 목록으로
      AccessibilityInfo.announceForAccessibility("퀴즈 목록으로 이동합니다");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("QuizList", {
        material,
        chapterId: firstChapter.chapterId,
      });
    }
  }, [firstChapter, quizzes, navigation, material]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // PlaybackChoice 전용 음성 명령(rawText) 처리
  const handlePlaybackVoiceRaw = useCallback(
    (spoken: string) => {
      const t = spoken.trim().toLowerCase();

      // 이어서 듣기
      if (
        t.includes("이어서") ||
        t.includes("이어 듣기") ||
        t.includes("이어듣기") ||
        t.includes("계속 듣기") ||
        t.includes("계속듣기")
      ) {
        if (material.hasProgress) {
          handleContinue();
        } else {
          AccessibilityInfo.announceForAccessibility(
            "아직 학습 기록이 없습니다. 처음부터 듣기를 사용해 주세요."
          );
        }
        return;
      }

      // 처음부터 듣기
      if (
        t.includes("처음부터") ||
        t.includes("처음 부터") ||
        t.includes("맨 처음") ||
        t.includes("처음부터 듣기")
      ) {
        handleFromStart();
        return;
      }

      // 저장 목록
      if (
        t.includes("저장 목록") ||
        t.includes("저장목록") ||
        t.includes("북마크 목록") ||
        t.includes("북마크목록") ||
        (t.includes("저장") && t.includes("목록"))
      ) {
        handleBookmarkPress();
        return;
      }

      // 질문 목록
      if (
        t.includes("질문 목록") ||
        t.includes("질문목록") ||
        (t.includes("질문") && t.includes("목록")) ||
        t.includes("질문 보기") ||
        t.includes("질문보기")
      ) {
        handleQuestionPress();
        return;
      }

      // 퀴즈 풀기 (전역 파서가 못 잡는 표현들 보완)
      if (
        t.includes("퀴즈 풀") ||
        t.includes("문제 풀") ||
        t.includes("퀴즈 시작") ||
        t.includes("퀴즈 보기")
      ) {
        if (showQuizButton) {
          handleQuizPress();
        } else {
          AccessibilityInfo.announceForAccessibility(
            "이 교재에서는 바로 풀 수 있는 퀴즈가 없습니다."
          );
        }
        return;
      }

      // 그 외: 안내
      console.log(
        "[VoiceCommands][PlaybackChoice] 처리할 수 없는 rawText:",
        spoken
      );
      AccessibilityInfo.announceForAccessibility(
        "이 화면에서 사용할 수 없는 음성 명령입니다. 이어서 듣기, 처음부터, 저장 목록, 질문 목록, 퀴즈 풀기, 뒤로 가기처럼 말해 주세요."
      );
    },
    [
      material.hasProgress,
      handleContinue,
      handleFromStart,
      handleBookmarkPress,
      handleQuestionPress,
      handleQuizPress,
      showQuizButton,
    ]
  );

  // TriggerContext와 음성 명령 핸들러 등록
  useEffect(() => {
    setCurrentScreenId("PlaybackChoice");

    registerVoiceHandlers("PlaybackChoice", {
      // 전역 명령: "뒤로 가" → 이전 화면
      goBack: handleGoBack,
      // "퀴즈" 전역 명령
      openQuiz: showQuizButton ? handleQuizPress : undefined,
      // 이 화면 전용 rawText 명령
      rawText: handlePlaybackVoiceRaw,
    });

    return () => {
      registerVoiceHandlers("PlaybackChoice", {});
    };
  }, [
    setCurrentScreenId,
    registerVoiceHandlers,
    handleGoBack,
    handleQuizPress,
    handlePlaybackVoiceRaw,
    showQuizButton,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 상단: 뒤로가기 + 음성 명령 버튼 */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessible={true}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          accessibilityHint="이전 화면으로 돌아갑니다"
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.voiceCommandButton,
            isVoiceCommandListening && styles.voiceCommandButtonActive,
          ]}
          onPress={startVoiceCommandListening}
          accessible={true}
          accessibilityLabel="음성 명령"
          accessibilityRole="button"
          accessibilityHint="두 번 탭한 후, 이어서 듣기, 처음부터, 저장 목록, 질문 목록, 퀴즈 풀기, 뒤로 가기와 같은 명령을 말씀하세요"
        >
          <Text style={styles.voiceCommandButtonText}>
            {isVoiceCommandListening ? "듣는 중…" : "음성 명령"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 교재 정보 */}
      <View style={styles.infoSection}>
        <Text
          style={styles.subjectText}
          accessible={true}
          accessibilityRole="header"
        >
          {material.title}
        </Text>
        <Text style={styles.chapterText}>{material.currentChapter}챕터</Text>
      </View>

      {/* 선택 버튼들 */}
      <View style={styles.buttonSection}>
        {/* 이어서 듣기 - 학습 진도가 있을 때만 표시 */}
        {material.hasProgress && (
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={handleContinue}
            accessible={true}
            accessibilityLabel="이어서 듣기, 마지막 위치부터"
            accessibilityRole="button"
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>이어서 듣기</Text>
              <Text style={styles.buttonSubtext}>마지막 위치부터</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 처음부터 듣기 */}
        <TouchableOpacity
          style={styles.choiceButton}
          onPress={handleFromStart}
          accessible={true}
          accessibilityLabel="처음부터 듣기, 챕터 처음부터"
          accessibilityRole="button"
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>처음부터 듣기</Text>
            <Text style={styles.buttonSubtext}>챕터 처음부터</Text>
          </View>
        </TouchableOpacity>

        {/* 저장 목록 */}
        <TouchableOpacity
          style={styles.choiceButton}
          onPress={handleBookmarkPress}
          accessible={true}
          accessibilityLabel="저장 목록"
          accessibilityRole="button"
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>저장 목록</Text>
            <Text style={styles.buttonSubtext}>북마크 보기</Text>
          </View>
        </TouchableOpacity>

        {/* 질문 목록 */}
        <TouchableOpacity
          style={styles.choiceButton}
          onPress={handleQuestionPress}
          accessible={true}
          accessibilityLabel="질문 목록"
          accessibilityRole="button"
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>질문 목록</Text>
            <Text style={styles.buttonSubtext}>이전 질문 보기</Text>
          </View>
        </TouchableOpacity>

        {/* 퀴즈 풀기 - 학습 진도가 있고 퀴즈가 있을 때만 표시 */}
        {showQuizButton && (
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={handleQuizPress}
            accessible={true}
            accessibilityLabel="퀴즈 풀기, 학습 내용 확인"
            accessibilityRole="button"
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>퀴즈 풀기</Text>
              <Text style={styles.buttonSubtext}>학습 내용 확인</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 20,
    color: "#2196F3",
    fontWeight: "600",
  },
  voiceCommandButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FF5722",
    backgroundColor: "#FFF3E0",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceCommandButtonActive: {
    borderColor: "#C62828",
    backgroundColor: "#FFCDD2",
  },
  voiceCommandButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E64A19",
  },
  infoSection: {
    marginBottom: 40,
    alignItems: "center",
  },
  subjectText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 8,
  },
  chapterText: {
    fontSize: 20,
    color: "#666666",
  },
  buttonSection: {
    gap: 16,
  },
  choiceButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    minHeight: 88,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333333",
    flex: 1,
  },
  buttonSubtext: {
    fontSize: 18,
    color: "#666666",
    marginLeft: 12,
  },
});