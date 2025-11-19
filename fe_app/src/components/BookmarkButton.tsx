import React, { useMemo } from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { HEADER_BTN_HEIGHT } from "../constants/dimensions";

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export default function BookmarkButton({
  isBookmarked,
  onPress,
  style,
}: BookmarkButtonProps) {
  const { colors, fontSize } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, fontSize),
    [colors, fontSize]
  );

  return (
    <TouchableOpacity
      style={[
        styles.bookmarkButton,
        isBookmarked && styles.bookmarkButtonActive,
        style,
      ]}
      onPress={onPress}
      accessible
      accessibilityLabel={isBookmarked ? "저장 해제하기" : "현재 챕터 저장하기"}
      accessibilityHint={
        isBookmarked
          ? "현재 챕터의 저장을 해제합니다."
          : "현재 학습 위치를 저장합니다."
      }
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.bookmarkButtonText,
          isBookmarked && styles.bookmarkButtonTextActive,
        ]}
      >
        {isBookmarked ? "저장 해제" : "저장하기"}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, fontSize: (size: number) => number) => {
  const isPrimaryColors = "primary" in colors;

  return StyleSheet.create({
    bookmarkButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 3,
      borderColor: isPrimaryColors ? colors.status.info : colors.status.info,
      backgroundColor: isPrimaryColors ? colors.status.infoLight : colors.background.elevated,
      height: HEADER_BTN_HEIGHT,
      width: 104,
      justifyContent: "center",
      alignItems: "center",
    },
    bookmarkButtonActive: {
      borderColor: isPrimaryColors ? "#43A047" : colors.status.success,
      backgroundColor: isPrimaryColors ? "#E8F5E9" : colors.background.elevated,
    },
    bookmarkButtonText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text.primary,
      lineHeight: 22,
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    bookmarkButtonTextActive: {
      color: isPrimaryColors ? "#1B5E20" : colors.status.success,
    },
  });
};