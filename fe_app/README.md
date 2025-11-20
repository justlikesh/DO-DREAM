# 두드림(DO:DREAM) - 시각장애 학생용 음성 학습 앱

> 시각장애 학생을 위한 AI 기반 음성 학습 지원 모바일 애플리케이션

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey.svg)
![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61dafb.svg)
![Expo](https://img.shields.io/badge/Expo-~54.0-000020.svg)

</div>

---

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [접근성 가이드](#-접근성-가이드)
- [디자인 시스템](#-디자인-시스템)
- [빌드 및 배포](#-빌드-및-배포)

---

## 🎯 프로젝트 소개

**두드림(DO:DREAM)**은 교육자-학생 연계형 시각장애 학습 플랫폼으로, 시각장애 학생들이 오직 **학습에만 집중(Focus)**할 수 있도록 설계된 **음성 중심**의 모바일 애플리케이션입니다.

### 핵심 컨셉

> "교육자가 직접 재구성하고(Curation), 학생은 오롯이 학습에만 집중할 수 있는(Focus) 오디오 기반 학습 플랫폼"

### 핵심 가치

- **완전한 접근성**: WCAG 2.2 AA/AAA 기준을 준수하는 시각장애인 최적화 UI/UX
- **음성 중심 인터페이스**: TTS(Text-to-Speech) 및 ASR(Automatic Speech Recognition) 기반 학습
- **능동적 학습 경험**: 음성 명령, 북마크로 학습 주도권 강화
- **AI 기반 학습 지원**: RAG 기반 질의응답 시스템으로 학습 내용에 대한 즉각적인 피드백
- **교육자 연계**: 선생님이 공유한 맞춤형 학습 자료로 효율적인 학습

### 시스템 구성

두드림은 **웹 플랫폼(교육자용)**과 **모바일 앱(학생용)**으로 구성된 연계형 학습 플랫폼입니다.

#### 🌐 웹 플랫폼 (교육자용)
교육자가 AI의 도움을 받아 학습 자료를 손쉽게 가공하고, 학생들의 학습을 관리하는 공간

- **AI 기반 스마트 학습자료 편집기**
  - PDF, HWP, 이미지 등 다양한 파일 업로드
  - AI 자동 구조화 (단원, 목차, 핵심 용어 추출)
  - 인터랙티브 편집 (단원 분리, 핵심 내용 강조, 퀴즈 생성)

- **학생 관리 및 맞춤형 공유**
  - 클래스/학생별 그룹 관리
  - 선택적 자료 공유 및 학습 목표 메시지 전송

- **학습 현황 대시보드**
  - 학생별 진도율 시각화
  - 퀴즈 결과 분석
  - 음성 질의 TOP 키워드로 취약 부분 파악

#### 📱 모바일 앱 (시각장애 학생용) - **본 저장소**
복잡한 기능을 모두 제거하고, 오직 **학습에만 몰입**할 수 있도록 설계된 음성 중심의 공간

---

## ✨ 주요 기능

### 1. 나만의 서재 (My Library)
- 📚 선생님이 공유한 학습 자료만 표시되는 단순한 화면
- 📋 '새로운 학습 자료', '학습 중인 자료'로 명확한 구분
- 🎯 불필요한 장식 없이 학습에만 집중

### 2. 집중 학습 모드 (Focus Mode)
- 📖 **섹션 단위 음성 재생**: 현재 듣고 있는 핵심 문장/단락만 화면에 표시
- ⏯️ **직관적 컨트롤**: 이전, 다음, 검색, 퀴즈 풀기 등 크고 명확한 버튼
- 🎚️ **재생 속도 조절**: 0.5x ~ 12.0x 속도 조절 가능
- 🔊 **완전 음성 제어**: 모든 기능을 음성 명령으로 제어 가능

### 3. 능동적 학습 기능 (Smart Learning)

#### 지능형 음성 명령
- 🎤 **질문하기**: 듣는 중 용어/개념에 대해 즉시 질문
- 🔊 **의미 단위 탐색**: "두 번째 챕터로 가줘"와 같은 자연어 명령
- 🤖 **AI 질의응답**: RAG 기반 학습 내용 관련 질문과 맞춤형 답변

#### 음성 저장(북마크)
- ⭐ **저장**: "저장" 음성 명령 - 중요 부분 즉시 저장
- 📝 **자동 텍스트 변환**: ASR로 질문과 음성 명령을 텍스트화
- 🔍 **검색 및 복습**: 저장된 부분만 효율적으로 복습

### 4. 완전 음성 지원 퀴즈
- ✅ **음성 출제**: 퀴즈 문제와 보기를 모두 음성으로 출력
- 🎤 **음성 답변**: 음성으로 답을 선택하거나 화면 버튼 사용
- 🎯 **즉각 피드백**: 정답 여부와 AI의 해설을 음성으로 즉시 제공
- 📊 **학습 진도율**: 완료한 퀴즈와 학습 진행 상황 추적

### 5. 하드웨어 기반 접근성 트리거 (TalkBack/VoiceOver 비충돌)
- 📱 **볼륨 UP 2회 연속**: 음성 질의 시작
- 📱 **볼륨 DOWN 2회 연속**: 음성 질의 중지
- 📱 **볼륨 UP 3회 연속**: 재생(교재 화면) / 음성으로 정답 입력(퀴즈 화면)
- 📱 **볼륨 DOWN 3회 연속**: 일시정지(교재 화면) / 음성 입력 중지(퀴즈 화면)
- 🎯 **표준 제스처**: 화면 버튼 포커스 후 더블 탭으로 실행
- 📲 **촉각 피드백**: Haptic Feedback으로 상호작용 강화

### 6. 개인화 설정
- 🌓 **고대비 모드**: 전맹/저시력 사용자를 위한 AAA 기준 색상 대비 (21:1)
- 🔤 **폰트 크기 조절**: 소/중/대 3단계
- 🔐 **생체 인증**: 지문/얼굴 인식 로그인

---

## 🛠 기술 스택

### Core
- **React Native**: 0.81.5
- **React**: 19.1.0
- **Expo**: ~54.0.18
- **TypeScript**: ~5.9.2

### Navigation
- **React Navigation**: ^7.1.18 (Native Stack)

### State Management
- **Zustand**: ^5.0.8 (전역 상태 관리)
- **MMKV**: 2.12.2 (로컬 스토리지)

### API & Network
- **Axios**: ^1.13.2 (HTTP 클라이언트)
- **Crypto-js**: ^4.2.0 (암호화)

### Accessibility & Voice
- **expo-speech**: ~14.0.7 (TTS)
- **expo-speech-recognition**: ^2.1.5 (ASR)
- **react-native-tts**: ^4.1.1 (추가 TTS 지원)
- **expo-haptics**: ~15.0.7 (햅틱 피드백)

### Media & Audio
- **expo-av**: ~16.0.7 (오디오 재생)

### Authentication & Security
- **expo-local-authentication**: ~17.0.7 (생체 인증)
- **@react-native-firebase/app**: ^23.5.0
- **@react-native-firebase/messaging**: ^23.5.0 (푸시 알림)

### Device
- **react-native-device-info**: ^14.1.1
- **react-native-keyevent**: ^0.3.2 (하드웨어 키 이벤트)

---

## 🚀 시작하기

### 사전 요구사항

- **Node.js**: >= 18.x
- **npm** 또는 **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Android Studio** (Android 개발 시)
- **Xcode** (iOS 개발 시, macOS만 가능)

### 설치 및 실행

1. **저장소 클론**
```bash
git clone <repository-url>
cd fe_app
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일 예시:
```env
API_BASE_URL=your_api_url
```

4. **개발 서버 실행**
```bash
# Expo 개발 서버 시작
npm start

# Android 에뮬레이터에서 실행
npm run android

# iOS 시뮬레이터에서 실행 (macOS만 가능)
npm run ios
```

---

## 📁 프로젝트 구조

```
fe_app/
├── src/
│   ├── api/                  # API 클라이언트 및 엔드포인트
│   │   ├── apiClient.ts      # Axios 인스턴스
│   │   ├── authApi.ts        # 인증 API
│   │   ├── materialApi.ts    # 학습 자료 API
│   │   ├── quizApi.ts        # 퀴즈 API
│   │   ├── ragApi.ts         # RAG 질의응답 API
│   │   └── interceptors.ts   # HTTP 인터셉터
│   │
│   ├── components/           # 재사용 가능한 컴포넌트
│   │   ├── BackButton.tsx
│   │   ├── BookmarkButton.tsx
│   │   ├── ChoiceButton.tsx
│   │   ├── PlayerHeader.tsx
│   │   ├── SectionRenderer.tsx
│   │   └── VoiceCommandButton.tsx
│   │
│   ├── screens/              # 화면 컴포넌트
│   │   ├── auth/             # 인증 화면
│   │   │   ├── SplashScreen.tsx
│   │   │   ├── AuthStartScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   └── SignupScreen.tsx
│   │   ├── library/          # 서재 화면
│   │   │   ├── LibraryScreen.tsx
│   │   │   └── BookmarkListScreen.tsx
│   │   ├── player/           # 플레이어 화면
│   │   │   ├── PlayerScreen.tsx
│   │   │   ├── PlaybackChoiceScreen.tsx
│   │   │   ├── QuestionScreen.tsx
│   │   │   └── QuestionListScreen.tsx
│   │   ├── quiz/             # 퀴즈 화면
│   │   │   ├── QuizListScreen.tsx
│   │   │   ├── QuizScreen.tsx
│   │   │   └── QuizResultScreen.tsx
│   │   └── settings/         # 설정 화면
│   │       └── SettingsScreen.tsx
│   │
│   ├── navigation/           # 네비게이션 설정
│   │   ├── AppNavigator.tsx
│   │   ├── navigationTypes.ts
│   │   └── RootNavigation.ts
│   │
│   ├── stores/               # Zustand 스토어
│   │   ├── authStore.ts      # 인증 상태
│   │   └── appSettingsStore.ts # 앱 설정
│   │
│   ├── services/             # 비즈니스 로직 서비스
│   │   ├── ttsService.ts     # TTS 서비스
│   │   ├── asrService.ts     # ASR 서비스
│   │   ├── authStorage.ts    # 인증 저장소
│   │   ├── appStorage.ts     # 앱 설정 저장소
│   │   └── bookmarkStorage.ts # 북마크 저장소
│   │
│   ├── hooks/                # Custom Hooks
│   │   ├── useTTSPlayer.ts   # TTS 플레이어 훅
│   │   └── useAccessibilityTriggers.ts
│   │
│   ├── contexts/             # React Context
│   │   └── ThemeContext.tsx  # 테마 컨텍스트
│   │
│   ├── triggers/             # 접근성 트리거
│   │   └── TriggerContext.tsx
│   │
│   ├── types/                # TypeScript 타입 정의
│   │   ├── api/              # API 타입
│   │   ├── auth.ts
│   │   ├── material.ts
│   │   ├── quiz.ts
│   │   └── ...
│   │
│   ├── constants/            # 상수 정의
│   │   ├── colors.ts         # 색상 팔레트
│   │   └── dimensions.ts     # 크기 상수
│   │
│   ├── styles/               # 공통 스타일
│   │   └── commonStyles.ts
│   │
│   ├── utils/                # 유틸리티 함수
│   │   ├── accessibility.ts
│   │   ├── biometric.ts
│   │   └── deviceUtils.ts
│   │
│   └── notifications/        # FCM 푸시 알림
│       └── fcmService.ts
│
├── assets/                   # 이미지, 폰트 등 정적 파일
├── docs/                     # 문서
│   └── DESIGN_GUIDE.md       # 디자인 가이드
├── plugins/                  # Expo 플러그인
├── android/                  # Android 네이티브 코드
├── app.json                  # Expo 설정
├── eas.json                  # EAS Build 설정
├── package.json
└── tsconfig.json
```

---

## ♿ 접근성 가이드

### WCAG 2.2 AA 준수

두드림 앱은 **Web Content Accessibility Guidelines (WCAG) 2.2 AA** 기준을 철저히 준수합니다.

#### WCAG 2.2 AA 기준 (일반 모드)
- ✅ **텍스트 대비율**: 최소 **4.5:1** (Success Criterion 1.4.3)
- ✅ **대형 텍스트 대비율**: 최소 **3:1** (18pt 이상 또는 14pt bold)
- ✅ **UI 컴포넌트 및 그래픽 대비율**: 최소 **3:1** (Success Criterion 1.4.11)
- ✅ **포커스 표시**: 최소 **3:1** 대비율의 명확한 포커스 인디케이터 (SC 2.4.11, 2.4.12 - WCAG 2.2 신규)
- ✅ **터치 타겟 크기**: 최소 **24×24 CSS 픽셀** (SC 2.5.8 - WCAG 2.2 신규)
- ✅ **텍스트 간격 조정**: 행간 1.5배, 문단 간격 2배 지원 (SC 1.4.12)

#### WCAG 2.2 AAA 기준 (고대비 모드)
- ✅ **텍스트 대비율**: 최소 **7:1** (Success Criterion 1.4.6)
- ✅ **향상된 색상 대비**: 최대 **21:1**로 저시력 사용자 지원
- ✅ **시각적 표현**: 배경/전경 색상 사용자 선택 가능 (SC 1.4.8)

### WCAG 2.2 주요 개선사항 적용

#### 1. **포커스 표시 강화** (SC 2.4.11, 2.4.12 - 신규)
- **Focus Appearance**: 모든 포커스 가능 요소에 최소 2픽셀 두께의 명확한 포커스 테두리
- **Focus Not Obscured**: 포커스된 요소가 다른 콘텐츠에 가려지지 않도록 보장
- 고대비 모드에서 노란색(#FEC73D) 포커스 링으로 명확한 시각적 피드백

#### 2. **터치 타겟 크기 준수** (SC 2.5.8 - 신규)
- 모든 인터랙티브 요소 최소 크기: **88-130px** (24px 기준 초과 달성)
- 버튼 간 충분한 간격 확보 (최소 16px)
- 터치 영역과 시각적 영역의 일치

#### 3. **드래그 기능 대안 제공** (SC 2.5.7 - 신규)
- 모든 드래그 동작에 대한 단일 포인터 대안 제공
- 음성 명령으로 모든 기능 수행 가능

### 접근성 기능

#### 1. **완벽한 스크린 리더 지원**
- ✅ 모든 UI 요소에 적절한 `accessibilityLabel` 제공
- ✅ 의미 있는 `accessibilityHint` 추가 (사용자 행동 안내)
- ✅ `accessibilityRole` 명시로 요소 유형 전달
- ✅ `accessibilityState`로 현재 상태 전달 (선택됨, 비활성화 등)
- ✅ TalkBack (Android) / VoiceOver (iOS) 완벽 호환
- ✅ `AccessibilityInfo.announceForAccessibility` 영역으로 동적 콘텐츠 변화 즉시 안내

#### 2. **완전한 음성 인터페이스**
- 🔊 **TTS**: 모든 텍스트 콘텐츠를 자연스러운 음성으로 읽기
- 🎤 **ASR**: 음성 명령 및 질문 입력
- 🎚️ **개인화**: 음성 속도(0.5x-2.0x), 피치 조절 가능
- 🗣️ **자연어 처리**: "두 번째 챕터로 가줘"와 같은 자연어 명령 이해

#### 3. **고대비 모드** (AAA 기준)
```typescript
// 사용 예시
const { isHighContrast, colors } = useTheme();

// 고대비 모드 색상
HIGH_CONTRAST_COLORS = {
  background: '#000000',      // 검정 배경
  text: {
    primary: '#ffffff',       // 흰색 (대비율 21:1)
    secondary: '#FEC73D',     // 노란색 (대비율 11.4:1)
  },
  accent: '#FEC73D',          // 노란색 액센트
}
```
- 검정 배경 + 흰색/노란색 텍스트
- 최대 대비율 21:1 (AAA 기준 7:1 초과)
- 모든 UI 요소에 두꺼운 경계선 (3-4px)

#### 4. **촉각 피드백 (Haptic Feedback)**
- ✅ 버튼 탭 시 햅틱 피드백
- ✅ 중요한 이벤트 발생 시 진동 알림

#### 5. **하드웨어 키 기반 트리거** (TalkBack/VoiceOver 비충돌)
- 📱 **볼륨 UP 2회 연속**: 음성 질의 시작
- 📱 **볼륨 DOWN 2회 연속**: 음성 질의 중지
- 📱 **볼륨 UP 3회 연속**: 재생(교재 화면) / 음성으로 정답 입력(퀴즈 화면)
- 📱 **볼륨 DOWN 3회 연속**: 일시정지(교재 화면) / 음성 입력 중지(퀴즈 화면)
- ⌨️ **외부 키보드 지원**: 모든 기능 키보드로 조작 가능
- 🔙 **뒤로가기 버튼**: 일관된 내비게이션

#### 6. **키보드 접근성**
- ✅ 모든 기능 키보드만으로 조작 가능
- ✅ 논리적 탭 순서 (Tab Order)
- ✅ 포커스 트랩 방지 (Focus Management)
- ✅ 단축키 지원 (음성 명령 대안)

#### 7. **시간 제한 없음**
- ⏱️ 학습 콘텐츠 재생 시간 제한 없음
- ⏸️ 언제든 일시정지 및 재개 가능
- 🔄 퀴즈 풀이 시간 제한 없음 (자기 주도 학습)

#### 8. **오류 예방 및 복구**
- ⚠️ 중요한 작업 전 확인 메시지
- 🔊 오류 발생 시 음성으로 명확한 설명
- ↩️ 쉬운 실행 취소 및 재시도

### WCAG 2.2 준수 요약표

| 성공 기준 | 레벨 | 상태 | 구현 내용 |
|---------|------|------|----------|
| **1.4.3** Contrast (Minimum) | AA | ✅ | 텍스트 대비율 최소 4.5:1 |
| **1.4.6** Contrast (Enhanced) | AAA | ✅ | 고대비 모드 최소 7:1 (최대 21:1) |
| **1.4.11** Non-text Contrast | AA | ✅ | UI 컴포넌트 대비율 최소 3:1 |
| **1.4.12** Text Spacing | AA | ✅ | 행간 1.5배, 문단 간격 2배 지원 |
| **2.4.11** Focus Appearance | AA | ✅ | 최소 2px 포커스 테두리, 3:1 대비율 |
| **2.4.12** Focus Not Obscured | AA | ✅ | 포커스 요소 가려짐 방지 |
| **2.5.7** Dragging Movements | AA | ✅ | 드래그 동작에 음성 명령 대안 제공 |
| **2.5.8** Target Size | AA | ✅ | 터치 타겟 최소 88-130px |

---

## 🎨 디자인 시스템

### 브랜드 컬러

#### Primary (남색 계열)
```typescript
primary: {
  main: '#192b55',      // 메인 브랜드 컬러
  dark: '#0f1a36',
  light: '#2d4478',
  lightest: '#e8ebf2',
}
```

#### Secondary (노란색 계열)
```typescript
secondary: {
  main: '#FEC73D',      // 강조 및 액센트
  dark: '#e5a510',
  light: '#ffd670',
  lightest: '#fff8e6',
}
```

### 디자인 원칙

1. **충분한 대비**: 모든 요소가 WCAG AA 이상 대비율 준수
2. **명확한 터치 영역**: 버튼 최소 높이 88-130px
3. **두꺼운 경계선**: 인터랙티브 요소 3-4px 테두리
4. **큰 폰트 크기**: 일반 앱 대비 1.5-2배
5. **일관된 색상 사용**: 기능별 색상 체계 통일

자세한 내용은 [`docs/DESIGN_GUIDE.md`](./docs/DESIGN_GUIDE.md)를 참고하세요.

---

## 📦 빌드 및 배포

### EAS Build

두드림은 **Expo Application Services (EAS)**를 사용하여 빌드 및 배포합니다.

#### 개발 빌드
```bash
# Android
eas build --profile development --platform android

# iOS
eas build --profile development --platform ios
```

#### 프로덕션 빌드
```bash
# Android APK/AAB
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios
```

---

## 🔑 주요 라이브러리 설명

### TTS (Text-to-Speech)
- **expo-speech**: Expo 기본 TTS 엔진
- **react-native-tts**: 고급 TTS 기능 (속도, 피치 조절)

### ASR (Automatic Speech Recognition)
- **expo-speech-recognition**: 음성 인식 및 텍스트 변환

### 로컬 저장소
- **react-native-mmkv**: 빠르고 안전한 key-value 스토리지

### 푸시 알림
- **Firebase Cloud Messaging (FCM)**: 크로스 플랫폼 푸시 알림

---

## 📚 참고 자료

### 접근성 가이드라인
- [WCAG 2.2 공식 문서](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 한국어 번역](https://www.w3.org/TR/WCAG22-ko/)
- [React Native Accessibility 가이드](https://reactnative.dev/docs/accessibility)
- [Android Accessibility 가이드](https://developer.android.com/guide/topics/ui/accessibility)
- [iOS Accessibility 가이드](https://developer.apple.com/accessibility/)

### 개발 문서
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/)

### 프로젝트 문서
- [디자인 가이드](./docs/DESIGN_GUIDE.md)

---

## 📄 라이선스

이 프로젝트는 `삼성 청년 SW.AI 아카데미`에서 진행한 비공개 프로젝트입니다. 무단 사용 및 배포를 금지합니다.

---

## 📞 문의

프로젝트 관련 문의사항이 있으시면 개발팀에 연락주세요.

---

<div align="center">

**두드림(DO:DREAM)** - 보이지 않아도, 배움은 깊게, 가르침은 쉽게.

Made with ❤️ for accessibility

**WCAG 2.2 AA/AAA 준수 | TalkBack/VoiceOver 완벽 호환**

</div>
