import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import BackButton from "./BackButton";
import VoiceCommandButton from "./VoiceCommandButton";
import { createCommonStyles } from "../styles/commonStyles";
import { useTheme } from "../contexts/ThemeContext";
import BookmarkButton from "./BookmarkButton";

interface PlayerHeaderProps {
  isBookmarked: boolean;
  onBackPress: () => void;
  onToggleBookmark: () => void;
  onBeforeListen: () => void;
}

export default function PlayerHeader({
  isBookmarked,
  onBackPress,
  onToggleBookmark,
  onBeforeListen,
}: PlayerHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(), []);
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);

  return (
    <View style={commonStyles.headerContainer}>
      {/* 상단: 뒤로 / 음성 명령 / 저장하기 */}
      <BackButton
        onPress={onBackPress}
        style={commonStyles.headerBackButton}
        accessibilityHint="교재 듣기 화면입니다. 말하기 버튼으로 재생, 일시정지, 다음, 이전 등의 명령을 사용할 수 있습니다."
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
  );
}

const createStyles = () => {
  return StyleSheet.create({
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      // gap: 8,
    },
  });
};
