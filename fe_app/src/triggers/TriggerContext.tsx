import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import { asrService } from '../services/asrService';

// 볼륨키 모드(기존)
type TriggerMode = 'voice' | 'playpause';

// 음성 명령 종류
type VoiceCommandKey =
  | 'playPause'
  | 'next'
  | 'prev'
  | 'openQuestion'
  | 'goBack'
  | 'openQuiz';

// 각 화면에서 등록할 핸들러들
type VoiceCommandHandlers = Partial<Record<VoiceCommandKey, () => void>>;

type Ctx = {
  mode: TriggerMode;
  setMode: (m: TriggerMode) => void;
  registerPlayPause: (fn: (() => void) | null) => void;
  getPlayPause: () => (() => void) | null;

  // 음성 명령 시스템
  /** 현재 활성 화면 ID (예: 'Player', 'Library' 등) */
  currentScreenId: string;
  setCurrentScreenId: (id: string) => void;

  /** 화면별 음성 명령 핸들러 등록 */
  registerVoiceHandlers: (screenId: string, handlers: VoiceCommandHandlers) => void;

  /** 음성 명령 인식 시작 (asrService.start 호출) */
  startVoiceCommandListening: () => Promise<void>;

  /** 음성 명령 인식 중 여부 */
  isVoiceCommandListening: boolean;
};

export const TriggerContext = createContext<Ctx>({
  mode: 'voice',
  setMode: () => {},
  registerPlayPause: () => {},
  getPlayPause: () => null,
  currentScreenId: '',
  setCurrentScreenId: () => {},
  registerVoiceHandlers: () => {},
  startVoiceCommandListening: async () => {},
  isVoiceCommandListening: false,
});

// 한국어 텍스트 → 명령 키로 단순 매핑
function parseVoiceCommand(raw: string): VoiceCommandKey | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;

  // 화면 이동 / 공통
  if (t.includes('뒤로') || t.includes('이전 화면')) return 'goBack';
  if (t.includes('질문')) return 'openQuestion';
  if (t.includes('퀴즈')) return 'openQuiz';

  // 재생 제어
  if (t.includes('다음')) return 'next';
  if (t.includes('이전') || t.includes('앞으로')) return 'prev';
  if (t.includes('재생') || t.includes('일시정지') || t.includes('멈춰')) {
    return 'playPause';
  }

  return null;
}

export function TriggerProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<TriggerMode>('voice');
  const playPauseRef = useRef<(() => void) | null>(null);

  const registerPlayPause = useCallback((fn: (() => void) | null) => {
    playPauseRef.current = fn;
  }, []);

  const getPlayPause = useCallback(() => playPauseRef.current, []);

  // 음성 명령 상태
  const [currentScreenId, setCurrentScreenId] = useState<string>('');
  const [isVoiceCommandListening, setIsVoiceCommandListening] = useState(false);

  // 화면별 핸들러 저장
  const voiceHandlersRef = useRef<Record<string, VoiceCommandHandlers>>({});

  // asrService.on() 해제 함수
  const asrOffRef = useRef<null | (() => void)>(null);

  const registerVoiceHandlers = useCallback(
    (screenId: string, handlers: VoiceCommandHandlers) => {
      voiceHandlersRef.current[screenId] = handlers;
    },
    []
  );

  const cleanupAsr = useCallback(() => {
    if (asrOffRef.current) {
      asrOffRef.current();
      asrOffRef.current = null;
    }
  }, []);

  const startVoiceCommandListening = useCallback(async () => {
    // 이미 듣는 중이면 다시 시작하지 않음
    if (isVoiceCommandListening) return;

    // 혹시 남아 있던 리스너 정리
    cleanupAsr();

    // asrService 이벤트 구독
    asrOffRef.current = asrService.on((raw, isFinal) => {
      if (!isFinal) return;
      const text = (raw || '').trim();
      if (!text) return;

      // 한 번 결과가 들어오면 바로 종료
      setIsVoiceCommandListening(false);
      asrService.stop().catch(() => {});
      cleanupAsr();

      const key = parseVoiceCommand(text);
      if (!key) {
        console.log('[VoiceCommands] 알 수 없는 명령:', text);
        return;
      }

      const handlers = voiceHandlersRef.current[currentScreenId];
      const handler = handlers?.[key];

      if (handler) {
        console.log('[VoiceCommands] 명령 실행:', key, 'text=', text);
        handler();
      } else {
        console.log(
          '[VoiceCommands] 현재 화면에서 처리할 수 없는 명령:',
          key,
          'text=',
          text
        );
      }
    });

    setIsVoiceCommandListening(true);
    try {
      await asrService.start({
        lang: 'ko-KR',
        interimResults: false,
        continuous: false,
        autoRestart: false,
      });
    } catch (e) {
      console.warn('[VoiceCommands] asrService.start 실패', e);
      setIsVoiceCommandListening(false);
      cleanupAsr();
    }
  }, [cleanupAsr, currentScreenId, isVoiceCommandListening]);

  // Provider 언마운트 시 ASR 정리
  useEffect(() => {
    return () => {
      cleanupAsr();
      asrService.abort();
    };
  }, [cleanupAsr]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      registerPlayPause,
      getPlayPause,
      currentScreenId,
      setCurrentScreenId,
      registerVoiceHandlers,
      startVoiceCommandListening,
      isVoiceCommandListening,
    }),
    [
      mode,
      registerPlayPause,
      getPlayPause,
      currentScreenId,
      registerVoiceHandlers,
      startVoiceCommandListening,
      isVoiceCommandListening,
    ]
  );

  return (
    <TriggerContext.Provider value={value}>{children}</TriggerContext.Provider>
  );
}
