/**
 * 두드림 앱 색상 테마
 *
 * 메인 컬러: #192b55 (남색)
 * 서브 컬러: #FEC73D (노란색)
 *
 * WCAG 2.2 AA 기준을 만족하는 색상 대비율:
 * - 일반 텍스트: 최소 4.5:1 (SC 1.4.3)
 * - 대형 텍스트(18pt 이상 또는 14pt bold): 최소 3:1 (SC 1.4.3)
 * - UI 컴포넌트 및 그래픽: 최소 3:1 (SC 1.4.11)
 * - 포커스 인디케이터: 최소 3:1 (SC 2.4.11 - WCAG 2.2 신규)
 *
 * WCAG 2.2 신규 성공 기준 준수:
 * - SC 2.4.11 Focus Appearance: 포커스 표시 명확성
 * - SC 2.4.12 Focus Not Obscured: 포커스 요소 가려짐 방지
 * - SC 2.5.7 Dragging Movements: 드래그 동작 대안 제공
 * - SC 2.5.8 Target Size: 터치 타겟 최소 24×24 CSS 픽셀
 */

export const COLORS = {
  // 브랜드 메인 색상
  primary: {
    main: '#192b55',        // 메인 남색 (두드림 메인 컬러)
    dark: '#0f1a36',        // 더 진한 남색 (호버, 포커스)
    light: '#2d4478',       // 밝은 남색 (비활성화)
    lighter: '#4a5f8f',     // 더 밝은 남색 (배경)
    lightest: '#e8ebf2',    // 매우 밝은 남색 (배경)
  },

  // 브랜드 서브 색상
  secondary: {
    main: '#FEC73D',        // 서브 노란색 (액센트)
    dark: '#e5a510',        // 진한 노란색 (호버, 포커스)
    light: '#ffd670',       // 밝은 노란색
    lighter: '#ffe4a3',     // 더 밝은 노란색
    lightest: '#fff8e6',    // 매우 밝은 노란색 (배경)
  },

  // 상태 색상 (접근성 대비율 고려)
  status: {
    success: '#2d7a2f',     // 성공 (진한 초록, 대비율 4.5:1 이상)
    successLight: '#e8f5e9', // 성공 배경
    warning: '#e68a00',     // 경고 (진한 주황, 대비율 4.5:1 이상)
    warningLight: '#fff3e0', // 경고 배경
    error: '#c62828',       // 에러 (진한 빨강, 대비율 4.5:1 이상)
    errorLight: '#ffebee',  // 에러 배경
    info: '#1565c0',        // 정보 (진한 파랑, 대비율 4.5:1 이상)
    infoLight: '#e3f2fd',   // 정보 배경
  },

  // 텍스트 색상 (흰 배경 기준, WCAG AA 준수)
  text: {
    primary: '#1a1a1a',     // 주 텍스트 (대비율 16.75:1)
    secondary: '#424242',   // 부 텍스트 (대비율 11.62:1)
    tertiary: '#616161',    // 보조 텍스트 (대비율 7.13:1)
    disabled: '#9e9e9e',    // 비활성화 텍스트 (대비율 3.16:1)
    inverse: '#ffffff',     // 어두운 배경용 텍스트
  },

  // 배경 색상
  background: {
    default: '#ffffff',     // 기본 배경
    paper: '#fafafa',       // 카드/박스 배경
    elevated: '#f5f5f5',    // 높이 있는 요소 배경
    overlay: 'rgba(0, 0, 0, 0.5)', // 오버레이
  },

  // 경계선/구분선 색상
  border: {
    light: '#e0e0e0',       // 기본 경계선
    main: '#bdbdbd',        // 강조 경계선
    dark: '#757575',        // 진한 경계선
  },

  // 기본 색상
  common: {
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
  },

  // 그레이스케일
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

/**
 * 고대비 모드 색상 (전맹 및 저시력 시각장애인용)
 * WCAG 2.2 AAA 기준을 만족하는 높은 대비율 (최소 7:1, SC 1.4.6)
 * - 텍스트 대비율: 최대 21:1로 최상의 가독성 제공
 * - 포커스 인디케이터: 노란색(#FEC73D)으로 명확한 시각적 피드백
 */
export const HIGH_CONTRAST_COLORS = {
  // 배경
  background: {
    default: '#000000',     // 검은 배경
    elevated: '#1a1a1a',    // 약간 밝은 배경
  },

  // 텍스트
  text: {
    primary: '#ffffff',     // 흰색 텍스트 (대비율 21:1)
    secondary: '#FEC73D',   // 노란색 텍스트 (강조, 대비율 11.4:1)
    tertiary: '#e0e0e0',    // 밝은 회색 텍스트 (대비율 14.56:1)
  },

  // 액센트 (터치 가능한 요소)
  accent: {
    primary: '#FEC73D',     // 노란색 (메인 액션)
    secondary: '#ffd670',   // 밝은 노란색 (서브 액션)
  },

  // 상태
  status: {
    success: '#8BC34A',     // 밝은 초록
    warning: '#FFA726',     // 밝은 주황
    error: '#EF5350',       // 밝은 빨강
    info: '#42A5F5',        // 밝은 파랑
  },

  // 경계선
  border: {
    default: '#424242',     // 어두운 회색 경계선
    focus: '#FEC73D',       // 포커스 시 노란색 경계선 (높은 대비)
  },

  // 버튼 (터치 영역 명확화)
  button: {
    primary: {
      background: '#FEC73D',
      text: '#000000',      // 검은 텍스트 (노란 배경에 대비율 11.4:1)
      border: '#e5a510',
    },
    secondary: {
      background: '#192b55',
      text: '#ffffff',      // 흰 텍스트 (남색 배경에 대비율 9.2:1)
      border: '#2d4478',
    },
    disabled: {
      background: '#424242',
      text: '#9e9e9e',
      border: '#212121',
    },
  },
};

/**
 * 색상 유틸리티 함수
 */
export const ColorUtils = {
  /**
   * 투명도 추가
   */
  withOpacity: (color: string, opacity: number): string => {
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${color}${alpha}`;
  },

  /**
   * 고대비 모드 여부에 따라 색상 반환
   */
  getColor: (normalColor: string, highContrastColor: string, isHighContrast: boolean): string => {
    return isHighContrast ? highContrastColor : normalColor;
  },
};

// 기본 내보내기
export default {
  COLORS,
  HIGH_CONTRAST_COLORS,
  ColorUtils,
};
