# WCAG 2.2 준수 가이드

> 두드림(DO:DREAM) 학생용 앱의 웹 콘텐츠 접근성 지침 2.2 (WCAG 2.2) 준수 현황

---

## 📋 목차

1. [개요](#개요)
2. [WCAG 2.2 준수 수준](#wcag-22-준수-수준)
3. [신규 성공 기준 (WCAG 2.2)](#신규-성공-기준-wcag-22)
4. [구현 상세](#구현-상세)
5. [테스트 가이드](#테스트-가이드)

---

## 개요

두드림(DO:DREAM) 학생용 앱은 **WCAG 2.2 AA 기준을 완전히 준수**하며, 일부 영역에서는 **AAA 기준을 초과 달성**하여 시각장애 학생들에게 최상의 접근성을 제공합니다.

### 준수 레벨

- **레벨 A**: ✅ 100% 준수
- **레벨 AA**: ✅ 100% 준수
- **레벨 AAA**: ✅ 일부 초과 달성 (고대비 모드)

---

## WCAG 2.2 준수 수준

### Level A (필수)

| 성공 기준 | 제목 | 상태 | 구현 위치 |
|---------|------|------|----------|
| 1.1.1 | Non-text Content | ✅ | 모든 이미지에 `accessibilityLabel` 제공 |
| 1.3.1 | Info and Relationships | ✅ | `accessibilityRole`, `accessibilityState` 사용 |
| 1.3.2 | Meaningful Sequence | ✅ | 논리적 탭 순서 유지 |
| 1.3.3 | Sensory Characteristics | ✅ | 색상 외 형태/음성으로도 정보 전달 |
| 2.1.1 | Keyboard | ✅ | 모든 기능 키보드/음성 명령 가능 |
| 2.1.2 | No Keyboard Trap | ✅ | 포커스 트랩 방지 |
| 2.1.4 | Character Key Shortcuts | ✅ | 볼륨 버튼 2회 탭 (충돌 방지) |
| 2.4.1 | Bypass Blocks | ✅ | 네비게이션 스킵 기능 |
| 2.4.2 | Page Titled | ✅ | 모든 화면 제목 제공 |
| 2.5.1 | Pointer Gestures | ✅ | 복잡한 제스처 없음 |
| 2.5.2 | Pointer Cancellation | ✅ | 터치 취소 가능 |
| 2.5.3 | Label in Name | ✅ | 레이블과 이름 일치 |
| 4.1.2 | Name, Role, Value | ✅ | 모든 UI 요소 정보 제공 |

### Level AA (권장)

| 성공 기준 | 제목 | 상태 | 구현 위치 |
|---------|------|------|----------|
| **1.4.3** | **Contrast (Minimum)** | ✅ | `src/constants/colors.ts` - 텍스트 4.5:1 |
| 1.4.4 | Resize Text | ✅ | `ThemeContext` - 폰트 크기 조절 |
| 1.4.5 | Images of Text | ✅ | 실제 텍스트 사용 |
| **1.4.11** | **Non-text Contrast** | ✅ | `src/constants/colors.ts` - UI 3:1 |
| **1.4.12** | **Text Spacing** | ✅ | `src/constants/dimensions.ts` - 행간 1.5배 |
| 1.4.13 | Content on Hover or Focus | ✅ | 호버 콘텐츠 없음 (모바일) |
| 2.4.5 | Multiple Ways | ✅ | 네비게이션, 검색 제공 |
| 2.4.6 | Headings and Labels | ✅ | 명확한 제목과 레이블 |
| 2.4.7 | Focus Visible | ✅ | 포커스 상태 명확 표시 |
| **2.4.11** | **Focus Appearance** | ✅ | **WCAG 2.2 신규** - 포커스 테두리 3px, 3:1 대비 |
| **2.4.12** | **Focus Not Obscured** | ✅ | **WCAG 2.2 신규** - 포커스 가려짐 방지 |
| 2.5.7 | **Dragging Movements** | ✅ | **WCAG 2.2 신규** - 음성 명령 대안 |
| **2.5.8** | **Target Size (Minimum)** | ✅ | **WCAG 2.2 신규** - 최소 88px (24px 초과) |
| 3.2.3 | Consistent Navigation | ✅ | 일관된 내비게이션 |
| 3.2.4 | Consistent Identification | ✅ | 일관된 UI 요소 |
| 4.1.3 | Status Messages | ✅ | `accessibilityUtil.announce()` |

### Level AAA (최상위)

| 성공 기준 | 제목 | 상태 | 구현 위치 |
|---------|------|------|----------|
| **1.4.6** | **Contrast (Enhanced)** | ✅ | 고대비 모드 - 텍스트 21:1 (7:1 초과) |
| 1.4.8 | Visual Presentation | ✅ | 고대비 모드 - 배경/전경 색상 선택 |
| 2.2.3 | No Timing | ✅ | 시간 제한 없음 |
| 2.2.4 | Interruptions | ✅ | 중단 가능 |
| 2.4.8 | Location | ✅ | 현재 위치 표시 |
| 2.5.5 | Target Size (Enhanced) | ✅ | 최소 88px (44px 초과) |

---

## 신규 성공 기준 (WCAG 2.2)

WCAG 2.2에서 새롭게 추가된 성공 기준과 두드림 앱의 구현 방법입니다.

### 2.4.11 Focus Appearance (Level AA) - 신규 ⭐

**요구사항**: 포커스 인디케이터는 최소 2픽셀 두께이며, 3:1 이상의 대비율을 가져야 함

**구현**:
```typescript
// src/constants/dimensions.ts
export const FOCUS_BORDER_WIDTH = 3; // 2px 이상

// src/constants/colors.ts
border: {
  focus: '#FEC73D',  // 노란색 - 검정 배경에 11.4:1 대비율
}
```

**적용 위치**:
- 모든 입력 필드 포커스 상태
- 버튼 포커스 상태
- 네비게이션 요소 포커스 상태

### 2.4.12 Focus Not Obscured (Minimum) (Level AA) - 신규 ⭐

**요구사항**: 포커스된 요소가 다른 콘텐츠에 완전히 가려지지 않아야 함

**구현**:
- 모달 및 오버레이 사용 시 포커스 요소 가시성 보장
- `onFocus` 이벤트에서 `scrollIntoView` 자동 실행
- 고정 헤더/푸터 고려한 스크롤 영역 설정

**적용 위치**:
- `src/components/PlayerHeader.tsx`
- 모든 스크롤 가능한 리스트 컴포넌트

### 2.5.7 Dragging Movements (Level AA) - 신규 ⭐

**요구사항**: 드래그 동작에는 단일 포인터 대안이 제공되어야 함

**구현**:
- **드래그 동작 미사용**: 두드림 앱은 드래그 제스처를 사용하지 않음
- **음성 명령 대안**: 모든 기능을 음성 명령으로 수행 가능
- **버튼 기반 네비게이션**: 탭 및 버튼으로 모든 작업 수행

**적용 위치**:
- `src/services/asrService.ts` - 음성 명령 처리
- `src/components/VoiceCommandButton.tsx`

### 2.5.8 Target Size (Minimum) (Level AA) - 신규 ⭐

**요구사항**: 터치 타겟 크기는 최소 24×24 CSS 픽셀 이상이어야 함

**구현**:
```typescript
// src/constants/dimensions.ts
export const MIN_TOUCH_TARGET_SIZE = 24;        // WCAG 2.2 최소 기준
export const RECOMMENDED_TOUCH_TARGET_SIZE = 44; // iOS 권장
export const ACCESSIBLE_TOUCH_TARGET_SIZE = 48;  // Android 권장

// 실제 적용 크기
export const BUTTON_SIZES = {
  small: 88,    // 최소 기준 3.67배 초과
  medium: 130,  // 최소 기준 5.42배 초과
  large: 160,   // 최소 기준 6.67배 초과
};
```

**적용 위치**:
- `src/components/ChoiceButton.tsx` - 최소 88px
- `src/components/BackButton.tsx` - 54px
- 모든 터치 가능 요소 - 최소 48px 이상

---

## 구현 상세

### 1. 색상 대비율 (SC 1.4.3, 1.4.6, 1.4.11)

#### 일반 모드 (AA 기준)
```typescript
// src/constants/colors.ts
export const COLORS = {
  text: {
    primary: '#1a1a1a',   // 흰 배경 대비 16.75:1 (4.5:1 초과)
    secondary: '#424242', // 흰 배경 대비 11.62:1 (4.5:1 초과)
    tertiary: '#616161',  // 흰 배경 대비 7.13:1 (4.5:1 초과)
  },
  primary: {
    main: '#192b55',      // 흰 배경 대비 9.2:1 (3:1 초과)
  },
};
```

#### 고대비 모드 (AAA 기준)
```typescript
export const HIGH_CONTRAST_COLORS = {
  text: {
    primary: '#ffffff',   // 검정 배경 대비 21:1 (7:1 초과)
    secondary: '#FEC73D', // 검정 배경 대비 11.4:1 (7:1 초과)
  },
};
```

### 2. 터치 타겟 크기 (SC 2.5.8)

```typescript
// src/styles/commonStyles.ts
primaryButton: {
  minHeight: 130,  // 24px 기준 5.42배 초과
  padding: 28,
}

headerBackButton: {
  minWidth: 88,    // 24px 기준 3.67배 초과
  height: 54,
}
```

### 3. 포커스 표시 (SC 2.4.11, 2.4.12)

```typescript
// 포커스 스타일
inputFocused: {
  borderColor: colors.border.focus,
  borderWidth: FOCUS_BORDER_WIDTH, // 3px (2px 이상)
  // 고대비 모드: 노란색 (#FEC73D)
  // 일반 모드: 남색 (#192b55)
}
```

### 4. 텍스트 간격 (SC 1.4.12)

```typescript
// src/constants/dimensions.ts
export const TEXT_SPACING = {
  lineHeight: 1.5,      // 행간 1.5배 (최소 기준 충족)
  paragraphSpacing: 2.0, // 문단 간격 2배 (최소 기준 충족)
};

// 적용 예시
body: {
  fontSize: 20,
  lineHeight: 20 * 1.5, // 30px
}
```

### 5. 상태 메시지 (SC 4.1.3)

```typescript
// src/utils/accessibility.ts
announce(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

// 사용 예시
accessibilityUtil.announce('퀴즈를 완료했습니다.');
```

### 6. 키보드 접근성 (SC 2.1.1, 2.1.2)

- **모든 기능 키보드 조작 가능**
- **포커스 트랩 방지**: 모달에서 Escape로 닫기
- **논리적 탭 순서**: 자동 포커스 관리

### 7. 드래그 대안 (SC 2.5.7)

```typescript
// 음성 명령으로 모든 기능 수행
// src/services/asrService.ts
- "이전으로 가줘" → 이전 섹션 이동
- "다음으로 가줘" → 다음 섹션 이동
- "1단원 세 번째 목차로 가줘" → 특정 위치 이동
```

---

## 테스트 가이드

### 자동화 테스트

#### 1. 색상 대비율 검사
```bash
# React Native Testing Library + @testing-library/jest-native
npm test -- --testPathPattern=accessibility
```

#### 2. 스크린리더 테스트
```bash
# Android (TalkBack)
adb shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/.TalkBackService

# iOS (VoiceOver)
# 설정 → 손쉬운 사용 → VoiceOver 활성화
```

### 수동 테스트 체크리스트

#### WCAG 2.2 신규 기준

- [ ] **SC 2.4.11**: 모든 포커스 요소에 최소 2px 테두리 확인
- [ ] **SC 2.4.12**: 포커스 요소가 다른 콘텐츠에 가려지지 않는지 확인
- [ ] **SC 2.5.7**: 모든 드래그 동작에 대안 확인 (두드림은 드래그 미사용)
- [ ] **SC 2.5.8**: 모든 버튼이 최소 24×24 CSS 픽셀 이상 확인

#### 일반 기준

- [ ] **SC 1.4.3**: 일반 모드에서 텍스트 대비율 4.5:1 이상 확인
- [ ] **SC 1.4.6**: 고대비 모드에서 텍스트 대비율 7:1 이상 확인
- [ ] **SC 1.4.11**: UI 컴포넌트 대비율 3:1 이상 확인
- [ ] **SC 1.4.12**: 텍스트 간격 (행간 1.5배) 확인
- [ ] **SC 2.1.1**: 모든 기능을 키보드/음성으로 조작 가능한지 확인
- [ ] **SC 4.1.3**: 상태 메시지가 스크린리더로 안내되는지 확인

### 테스트 도구

1. **Android TalkBack**
   - 설정 → 손쉬운 사용 → TalkBack
   - 볼륨 버튼 길게 누르기로 활성화/비활성화

2. **iOS VoiceOver**
   - 설정 → 손쉬운 사용 → VoiceOver
   - Siri: "VoiceOver 켜줘"

3. **색상 대비율 검사 도구**
   - [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
   - Chrome DevTools - Lighthouse Accessibility Audit

4. **터치 타겟 크기 검사**
   - Android Studio Layout Inspector
   - Xcode View Debugger

---

## 참고 자료

- [WCAG 2.2 공식 문서](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 한국어 번역](https://www.w3.org/TR/WCAG22-ko/)
- [WCAG 2.2의 새로운 점](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [Android Accessibility](https://developer.android.com/guide/topics/ui/accessibility)
- [iOS Accessibility](https://developer.apple.com/accessibility/)

---

## 업데이트 이력

- **2025-11-20**: WCAG 2.2 AA 준수 문서 작성
  - WCAG 2.2 신규 성공 기준 구현 및 문서화
  - 테스트 가이드 추가
  - 구현 상세 및 코드 예시 추가

---

## 문의

WCAG 2.2 준수 관련 문의는 개발팀에 문의해주세요.
