import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import BackButton from "./BackButton";
import VoiceCommandButton from "./VoiceCommandButton";
import { createCommonStyles } from "../styles/commonStyles";
import BookmarkButton from "./BookmarkButton";
import { Material } from "../types/material";
import { Chapter } from "../types/chapter";
import { useTheme } from "../contexts/ThemeContext";
import { HEADER_BTN_HEIGHT } from "../constants/dimensions";
type PlayModeKey = "single" | "continuous" | "repeat";

const UI_MODE_LABELS: Record<PlayModeKey, string> = {
  continuous: "연속",
  repeat: "반복",
  single: "한 섹션씩",
};

interface PlayerHeaderProps {
  material: Material;
  chapter: Chapter;
  playMode: PlayModeKey;
  isBookmarked: boolean;
  onBackPress: () => void;
  onToggleBookmark: () => void;
  onBeforeListen: () => void;
}

export default function PlayerHeader({
  material,
  chapter,
  playMode,
  isBookmarked,
  onBackPress,
  onToggleBookmark,
  onBeforeListen,
}: PlayerHeaderProps) {
  const { colors, fontSize } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);

  const styles = useMemo(() => createStyles(colors, fontSize), [colors, fontSize]);

  return (
    <View style={styles.header}>
      {/* 상단: 뒤로 / 음성 명령 / 저장하기 */}
      <View style={styles.headerTop}>
        <BackButton
          onPress={onBackPress}
          style={commonStyles.headerBackButton}
          accessibilityHint="교재 듣기 화면입니다. 음성 명령 버튼으로 재생, 일시정지, 다음, 이전 등의 명령을 사용할 수 있습니다."
        />

        <View style={styles.headerRight}>
          <BookmarkButton
            isBookmarked={isBookmarked}
            onPress={onToggleBookmark}
          />
          <VoiceCommandButton
            style={commonStyles.headerVoiceButton}
            accessibilityHint="두 번 탭한 후 재생, 일시정지, 다음, 이전, 질문하기, 저장하기, 퀴즈 풀기, 설정 열기, 한 섹션씩 모드, 연속 모드, 반복 모드, 뒤로 가기와 같은 명령을 말씀하세요."
            onBeforeListen={onBeforeListen}
          />
        </View>
      </View>

      {/* 하단: 과목 / 챕터 제목 / 모드 표시 */}
      <View style={styles.headerInfo}>
        <Text style={styles.subjectText}>{material.subject}</Text>
        <Text
          style={styles.chapterTitle}
          accessibilityRole="header"
          accessibilityLabel={`${material.subject} ${chapter.title}, 현재 모드 ${UI_MODE_LABELS[playMode]} 모드`}
        >
          {chapter.title}
        </Text>
        <Text style={styles.modeIndicator}>
          모드: {UI_MODE_LABELS[playMode]}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: any, fontSize: (size: number) => number) => {
  const isPrimaryColors = 'primary' in colors;

  return StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: isPrimaryColors ? colors.primary.main : colors.border.default,
      backgroundColor: colors.background.default,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderBottomWidth: 0,
      minHeight: HEADER_BTN_HEIGHT,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      height: HEADER_BTN_HEIGHT,
    },
    headerInfo: {
      marginTop: 8,
    },
    subjectText: {
      fontSize: 18,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    chapterTitle: {
      fontSize: fontSize(24),
      fontWeight: "bold",
      color: colors.text.primary,
      marginBottom: 6,
    },
    modeIndicator: {
      fontSize: fontSize(15),
      color: isPrimaryColors ? colors.status.info : colors.status.info,
      fontWeight: "600",
    },
  });
};
