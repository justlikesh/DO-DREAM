/**
 * 앱 전체에서 사용하는 크기 관련 상수들
 * WCAG 2.2 AA 기준 준수
 */

/**
 * WCAG 2.2 터치 타겟 크기 기준
 * SC 2.5.8 Target Size (Minimum): 최소 24×24 CSS 픽셀
 *
 * 두드림 앱은 이 기준을 초과하는 크기를 사용하여 더 나은 접근성 제공
 */
export const MIN_TOUCH_TARGET_SIZE = 24; // WCAG 2.2 최소 기준 (CSS 픽셀)
export const RECOMMENDED_TOUCH_TARGET_SIZE = 44; // iOS HIG 권장 크기
export const ACCESSIBLE_TOUCH_TARGET_SIZE = 48; // Android Material 권장 크기

/**
 * 헤더 버튼의 표준 높이
 * - BackButton, VoiceCommandButton, SettingsButton 등 헤더의 모든 버튼에 적용
 * - 모든 화면에서 일관된 버튼 높이를 유지하여 UI 통일성 확보
 * - WCAG 2.2 SC 2.5.8 기준(24px) 초과 달성 (54px)
 */
export const HEADER_BTN_HEIGHT = 54;

/**
 * 헤더 컨테이너의 최소 높이
 * - HEADER_BTN_HEIGHT + 패딩(32px)으로 계산
 * - 헤더 내부 요소들이 수직으로 가운데 정렬될 수 있도록 충분한 공간 확보
 */
export const HEADER_MIN_HEIGHT = HEADER_BTN_HEIGHT + 32;

/**
 * WCAG 2.2 포커스 표시 기준
 * SC 2.4.11 Focus Appearance: 최소 2픽셀 두께의 포커스 테두리
 * SC 2.4.11: 포커스 인디케이터는 최소 3:1 대비율 필요
 */
export const FOCUS_BORDER_WIDTH = 3; // 포커스 테두리 두께 (2px 이상)
export const FOCUS_BORDER_RADIUS = 4; // 포커스 테두리 둥근 모서리

/**
 * 버튼 크기 상수 (WCAG 2.2 준수)
 */
export const BUTTON_SIZES = {
  small: 88,    // 작은 버튼 (최소 기준 24px 초과)
  medium: 130,  // 중간 버튼 (기본값)
  large: 160,   // 큰 버튼
};

/**
 * 버튼 간격 (충분한 터치 영역 확보)
 */
export const BUTTON_SPACING = 16; // 버튼 간 최소 간격

/**
 * 텍스트 간격 (WCAG 2.2 SC 1.4.12)
 * - 행간: 최소 1.5배
 * - 문단 간격: 최소 2배
 */
export const TEXT_SPACING = {
  lineHeight: 1.5,      // 행간 (글자 크기의 1.5배)
  paragraphSpacing: 2.0, // 문단 간격 (글자 크기의 2배)
};
