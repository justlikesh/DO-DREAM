/**
 * 공통 스타일 시트
 * WCAG 2.2 AA/AAA 기준 준수
 *
 * WCAG 2.2 준수 사항:
 * - SC 1.4.3: 텍스트 대비율 최소 4.5:1
 * - SC 1.4.11: UI 컴포넌트 대비율 최소 3:1
 * - SC 1.4.12: 텍스트 간격 조정 (행간 1.5배)
 * - SC 2.4.11: 포커스 외관 (최소 2px 테두리, 3:1 대비율)
 * - SC 2.5.8: 터치 타겟 크기 최소 24×24 CSS 픽셀
 */

import { StyleSheet } from "react-native";
import { COLORS, HIGH_CONTRAST_COLORS } from "../constants/colors";
import {
  HEADER_BTN_HEIGHT,
  HEADER_MIN_HEIGHT,
  FOCUS_BORDER_WIDTH,
  BUTTON_SPACING,
  TEXT_SPACING,
} from "../constants/dimensions";

type ThemeColors = typeof COLORS | typeof HIGH_CONTRAST_COLORS;

/**
 * 테마에 따른 공통 스타일 생성 함수
 * @param colors - 고대비 모드 여부에 따른 색상 객체
 */
export const createCommonStyles = (colors: ThemeColors) => StyleSheet.create({
  // 컨테이너
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },

  // 화면 상단 헤더 컨테이너
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 3, // 두꺼운 경계선 (접근성)
    borderBottomColor: COLORS.primary.main, // 명확한 구분선 (시각장애인 접근성)
    minHeight: HEADER_MIN_HEIGHT,
  },
  headerBackButton: {
    padding: 0,
    minWidth: 88, // 충분한 터치 영역
    height: HEADER_BTN_HEIGHT,
  },
  headerVoiceButton: {
    padding: 0,
    minWidth: 88,
    height: HEADER_BTN_HEIGHT,
  },

  // 메인 버튼 (Primary)
  primaryButton: {
    backgroundColor: 'primary' in colors ? colors.primary.main : colors.accent.primary,
    borderWidth: 4,
    borderColor: 'primary' in colors ? colors.primary.dark : colors.border.focus,
    padding: 28,
    borderRadius: 16,
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: 'button' in colors ? colors.button.primary.text : COLORS.common.white,
    fontSize: 26,
    fontWeight: "bold",
  },

  // 보조 버튼 (Secondary)
  secondaryButton: {
    backgroundColor: 'secondary' in colors ? colors.secondary.main : colors.accent.secondary,
    borderWidth: 4,
    borderColor: 'secondary' in colors ? colors.secondary.dark : colors.border.focus,
    padding: 28,
    borderRadius: 16,
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 26,
    fontWeight: "bold",
  },

  // 텍스트 스타일 (WCAG 2.2 SC 1.4.12: 텍스트 간격)
  title: {
    fontSize: 52,
    fontWeight: "bold",
    color: 'primary' in colors ? colors.primary.main : colors.accent.primary,
    marginBottom: 16,
    lineHeight: 52 * TEXT_SPACING.lineHeight, // 행간 1.5배
  },
  subtitle: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.text.secondary,
    marginBottom: 12,
    lineHeight: 32 * TEXT_SPACING.lineHeight, // 행간 1.5배
  },
  body: {
    fontSize: 20,
    color: colors.text.primary,
    lineHeight: 20 * TEXT_SPACING.lineHeight, // 행간 1.5배 (30px)
  },
  smallText: {
    fontSize: 18,
    color: colors.text.tertiary || colors.text.secondary,
    lineHeight: 18 * TEXT_SPACING.lineHeight, // 행간 1.5배
  },

  // 입력 필드 (WCAG 2.2 SC 2.5.8: 터치 타겟 크기)
  input: {
    fontSize: 26,
    padding: 18,
    borderWidth: 3,
    borderColor: 'primary' in colors ? colors.border.main : colors.border.default,
    borderRadius: 12,
    backgroundColor: colors.background.default,
    color: colors.text.primary,
    minHeight: 60, // 터치 타겟 크기 기준 초과
  },
  // WCAG 2.2 SC 2.4.11: Focus Appearance (포커스 외관)
  inputFocused: {
    borderColor: 'primary' in colors ? colors.primary.main : colors.border.focus,
    borderWidth: FOCUS_BORDER_WIDTH, // 최소 2px 이상의 포커스 테두리
  },

  // 카드/박스
  card: {
    backgroundColor: 'primary' in colors ? colors.primary.lightest : colors.background.elevated,
    borderWidth: 2,
    borderColor: 'primary' in colors ? colors.primary.main : colors.border.focus,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },

  // 여백
  marginBottom16: {
    marginBottom: 16,
  },
  marginBottom24: {
    marginBottom: 24,
  },
  marginBottom32: {
    marginBottom: 32,
  },

  // 중앙 정렬
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
});

/**
 * 기본 스타일 (고대비 모드 미적용)
 * 하위 호환성을 위해 유지
 */
export const commonStyles = createCommonStyles(COLORS);