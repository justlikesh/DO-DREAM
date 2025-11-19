import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { asrService } from "../services/asrService";
import { useNavigation } from "@react-navigation/native";
import { AccessibilityInfo } from "react-native";

// 볼륨키 모드
type TriggerMode = "voice" | "playpause";

// 화면별로 등록할 음성 명령 핸들러들
type VoiceCommandHandlers = {
  playPause?: () => void;
  next?: () => void;
  prev?: () => void;
  openQuestion?: () => void;
  goBack?: () => void;
  openQuiz?: () => void;
  openSettings?: () => void;
  openLibrary?: () => void;

  /**
   * 인식된 원문 텍스트를 그대로 받아 처리하는 핸들러
   */
  rawText?: (spoken: string) => boolean; // 처리했으면 true, 안했으면 false
};

// 화면별로 등록할 볼륨키 트리거 핸들러
export type VolumeTriggerHandlers = {
  onVolumeUpPress?: (count: number) => void;
  onVolumeDownPress?: (count: number) => void;
};

// TriggerContext에 들어갈 타입
type Ctx = {
  mode: TriggerMode;
  setMode: (m: TriggerMode) => void;

  registerPlayPause: (fn: (() => void) | null) => void;
  getPlayPause: () => (() => void) | null;

  registerTTSPlay: (fn: (() => void) | null) => void;
  registerTTSPause: (fn: (() => void) | null) => void;
  getTTSPlayRef: () => (() => void) | null;
  getTTSPauseRef: () => (() => void) | null;

  currentScreenId: string;
  setCurrentScreenId: (id: string) => void;
  getCurrentScreenId: () => string;

  registerVoiceHandlers: (
    screenId: string,
    handlers: VoiceCommandHandlers
  ) => void;

  volumeTriggerHandlers: Record<string, VolumeTriggerHandlers>;

  registerVolumeTriggers: (
    screenId: string,
    handlers: VolumeTriggerHandlers
  ) => void;

  startVoiceCommandListening: () => Promise<void>;
  stopVoiceCommandListening: () => Promise<void>;
  isVoiceCommandListening: boolean;
};

export const TriggerContext = createContext<Ctx>({
  mode: "voice",
  setMode: () => {},

  registerPlayPause: () => {},
  getPlayPause: () => null,

  registerTTSPlay: () => {},
  registerTTSPause: () => {},
  getTTSPlayRef: () => null,
  getTTSPauseRef: () => null,

  currentScreenId: "",
  setCurrentScreenId: () => {},
  getCurrentScreenId: () => "",

  registerVoiceHandlers: () => {},

  volumeTriggerHandlers: {},

  registerVolumeTriggers: () => {},

  startVoiceCommandListening: async () => {},
  stopVoiceCommandListening: async () => {},
  isVoiceCommandListening: false,
});

// 전역 공통 명령 키
type VoiceCommandKey =
  | "playPause"
  | "next"
  | "prev"
  | "openQuestion"
  | "goBack"
  | "openQuiz"
  | "openSettings"
  | "openLibrary";

// 간단한 한국어 → 명령 키 매핑
function parseVoiceCommand(raw: string): VoiceCommandKey | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;

  if (t.includes("로비") || t.includes("홈") || t.includes("서재") || t.includes("목록")) {
    return "openLibrary";
  }

  if (t.includes("뒤로") || t.includes("이전 화면") || t.includes("돌아가"))
    return "goBack";

  if (t === "설정" || t.includes("설정 열기") || t.includes("설정 화면"))
    return "openSettings";

  if (
    t === "질문" ||
    t === "질문하기" ||
    t.includes("질문 하기") ||
    t.includes("질문해줘")
  )
    return "openQuestion";

  if (t === "퀴즈" || t === "퀴즈 풀기" || t.includes("퀴즈 시작"))
    return "openQuiz";

  if (
    t.includes("다음 챕터") ||
    t.includes("다음장") ||
    (t === "다음" && !t.includes("질문"))
  )
    return "next";

  if (
    t.includes("이전 챕터") ||
    t.includes("앞장") ||
    (t === "이전" && !t.includes("화면"))
  )
    return "prev";

  if (
    t.includes("재생") ||
    t.includes("일시정지") ||
    t.includes("멈춰") ||
    t.includes("정지")
  )
    return "playPause";

  return null;
}

export function TriggerProvider({ children }: { children: React.ReactNode }) {
  // (1) 볼륨키 모드
  const navigation = useNavigation();
  const [mode, setMode] = useState<TriggerMode>("voice");

  // (2) 재생/정지 토글용 핸들러 (기존)
  const playPauseRef = useRef<(() => void) | null>(null);
  const registerPlayPause = useCallback((fn: (() => void) | null) => {
    playPauseRef.current = fn;
  }, []);
  const getPlayPause = useCallback(() => playPauseRef.current, []);

  // (3) PlayerScreen 전용 재생 / 정지 핸들러 (신규)
  const ttsPlayRef = useRef<(() => void) | null>(null);
  const ttsPauseRef = useRef<(() => void) | null>(null);

  const registerTTSPlay = useCallback((fn: (() => void) | null) => {
    ttsPlayRef.current = fn;
  }, []);
  const registerTTSPause = useCallback((fn: (() => void) | null) => {
    ttsPauseRef.current = fn;
  }, []);

  const getTTSPlayRef = useCallback(() => ttsPlayRef.current, []);
  const getTTSPauseRef = useCallback(() => ttsPauseRef.current, []);

  // (4) 현재 화면 ID - ref로 변경하여 항상 최신 값 참조
  const currentScreenIdRef = useRef<string>("");
  const setCurrentScreenId = useCallback((id: string) => {
    console.log("[TriggerContext] setCurrentScreenId:", id);
    currentScreenIdRef.current = id;
  }, []);
  const getCurrentScreenId = useCallback(() => currentScreenIdRef.current, []);

  // (5) VoiceCommand 핸들러
  const voiceHandlersRef = useRef<Record<string, VoiceCommandHandlers>>({});
  const registerVoiceHandlers = useCallback(
    (screenId: string, handlers: VoiceCommandHandlers) => {
      voiceHandlersRef.current[screenId] = handlers;
    },
    []
  );

  // (5-2) VolumeTrigger 핸들러
  const volumeTriggerHandlersRef = useRef<Record<string, VolumeTriggerHandlers>>({});
  const registerVolumeTriggers = useCallback(
    (screenId: string, handlers: VolumeTriggerHandlers) => {
      volumeTriggerHandlersRef.current[screenId] = handlers;
    },
    []
  );

  const handleOpenLibrary = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.navigate("Library" as never);
    } else {
      navigation.reset({ index: 0, routes: [{ name: "Library" as never }] });
    }
  }, [navigation]);

  // (6) 음성 인식 상태/타이머
  const [isVoiceCommandListening, setIsVoiceCommandListening] = useState(false);
  const asrOffRef = useRef<null | (() => void)>(null);
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearVoiceTimeout = useCallback(() => {
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
  }, []);

  const cleanupAsr = useCallback(() => {
    if (asrOffRef.current) {
      asrOffRef.current();
      asrOffRef.current = null;
    }
  }, []);

  // (7) 음성 명령 종료
  const stopVoiceCommandListening = useCallback(async () => {
    clearVoiceTimeout();
    setIsVoiceCommandListening(false);
    cleanupAsr();
    try {
      await asrService.stop();
    } catch (e) {
      console.warn("[VoiceCommands] stopVoiceCommandListening 실패:", e);
    }
  }, [clearVoiceTimeout, cleanupAsr]);

  // (8) 음성 명령 시작
  const startVoiceCommandListening = useCallback(async () => {
    if (isVoiceCommandListening) return;

    clearVoiceTimeout();
    cleanupAsr();

    // STT 구독
    asrOffRef.current = asrService.on((raw, isFinal) => {
      if (!isFinal) return;

      const text = (raw || "").trim();
      if (!text) return;

      clearVoiceTimeout();
      setIsVoiceCommandListening(false);
      asrService.stop().catch(() => {});
      cleanupAsr();

      const screenId = currentScreenIdRef.current;
      const handlers =
        voiceHandlersRef.current[screenId] ||
        ({} as VoiceCommandHandlers);

      // (A) 현재 화면의 rawText 핸들러 우선 처리
      if (handlers.rawText) {
        console.log("[VoiceCommands] rawText 핸들러 호출:", text);
        try {
          const handled = handlers.rawText(text);
          if (handled) {
            return; // rawText 핸들러가 처리했으면 여기서 종료
          }
        } catch (e) {
          console.warn("[VoiceCommands] rawText 오류:", e);
        }
      }

      const key = parseVoiceCommand(text);

      // (B) 화면별 전역 명령 매칭
      if (key && handlers[key]) {
        console.log(
          "[VoiceCommands] 명령 실행:",
          key,
          "screen=",
          screenId,
          "text=",
          text
        );
        try {
          handlers[key]!();
        } catch (e) {
          console.warn("[VoiceCommands] 핸들러 실행 오류:", e);
        }
        return;
      }

      // (C) 전역 핸들러 매칭 (화면별 핸들러에 없는 경우)
      if (key === "openLibrary") {
        console.log(
          "[VoiceCommands] 명령 실행:",
          key,
          "screen=",
          screenId,
          "text=",
          text
        );
        handleOpenLibrary();
        return;
      }

      console.log(
        "[VoiceCommands] 처리 불가:",
        text,
        "screen=",
        screenId,
        "parsed=",
        key
      );
    });

    setIsVoiceCommandListening(true);

    // 미인식 타임아웃
    voiceTimeoutRef.current = setTimeout(() => {
      console.log(
        "[VoiceCommands] 타임아웃: 음성 명령 미인식으로 자동 종료"
      );
      setIsVoiceCommandListening(false);
      asrService.stop().catch(() => {});
      cleanupAsr();
      AccessibilityInfo.announceForAccessibility(
        "음성 명령을 인식하지 못해 종료했습니다."
      );
    }, 6000); // 6초 정도 대기 (필요하면 숫자 조절 가능)

    try {
      await asrService.start({
        lang: "ko-KR",
        interimResults: false,
        continuous: false,
        autoRestart: false,
      });
    } catch (e) {
      console.warn("[VoiceCommands] asrService.start 실패:", e);
      clearVoiceTimeout();
      setIsVoiceCommandListening(false);
      cleanupAsr();
    }
  }, [
    isVoiceCommandListening,
    clearVoiceTimeout,
    cleanupAsr,
  ]);

  // Provider 언마운트 시 정리
  useEffect(() => {
    return () => {
      clearVoiceTimeout();
      cleanupAsr();
      asrService.abort();
    };
  }, [clearVoiceTimeout, cleanupAsr]);

  const value = useMemo(
    () => ({
      mode,
      setMode,

      registerPlayPause,
      getPlayPause,

      registerTTSPlay,
      registerTTSPause,
      getTTSPlayRef,
      getTTSPauseRef,

      currentScreenId: currentScreenIdRef.current,
      setCurrentScreenId,
      getCurrentScreenId,

      registerVoiceHandlers,

      volumeTriggerHandlers: volumeTriggerHandlersRef.current, // 이 부분은 직접 사용하지 않고, GlobalVoiceTriggers에서 참조
      registerVolumeTriggers,

      startVoiceCommandListening,
      stopVoiceCommandListening,
      isVoiceCommandListening,
    }),
    [
      mode,
      registerPlayPause,
      getPlayPause,
      registerTTSPlay,
      registerTTSPause,
      getTTSPlayRef,
      getTTSPauseRef,
      setCurrentScreenId,
      getCurrentScreenId,
      registerVoiceHandlers,
      registerVolumeTriggers,
      startVoiceCommandListening,
      stopVoiceCommandListening,
      isVoiceCommandListening,
    ]
  );

  return (
    <TriggerContext.Provider value={value}>
      {children}
    </TriggerContext.Provider>
  );
}
