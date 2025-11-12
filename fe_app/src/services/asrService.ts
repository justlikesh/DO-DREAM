import {
  ExpoSpeechRecognitionModule as ASR,
  type ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

export type ASRConfig = {
  lang?: string;            // 기본 'ko-KR'
  interimResults?: boolean; // 중간 결과 수신
  continuous?: boolean;     // 엔진 연속 인식 힌트
  autoRestart?: boolean;    // 엔진이 끊겨도 즉시 재시작
  maxSessionMs?: number;    // 세션 롤오버(안정성)
};

type Listener = (text: string, isFinal: boolean) => void;

class ASRService {
  private listeners = new Set<Listener>();
  private recognizing = false;
  private buffer = "";
  private sessionStartedAt = 0;
  private cfg: Required<ASRConfig>;
  private subs: { remove: () => void }[] = [];

  constructor() {
    this.cfg = {
      lang: "ko-KR",
      interimResults: true,
      continuous: true,
      autoRestart: true,
      maxSessionMs: 8 * 60 * 1000,
    };
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private emit(text: string, isFinal: boolean) {
    for (const fn of this.listeners) fn(text, isFinal);
  }

  private attachEvents() {
    this.detachEvents();

    const onResult = (e: ExpoSpeechRecognitionResultEvent) => {
      const text = (e.results?.map((r) => r.transcript).join(" ") || "").trim();
      if (!text) return;

      if (e.isFinal) {
        this.buffer = (this.buffer + " " + text).trim();
        this.emit(this.buffer, true);
      } else {
        const preview = (this.buffer + " " + text).trim();
        this.emit(preview, false);
      }
    };

    const onEnd = () => {
      if (!this.recognizing) return;

      // 세션 롤오버(긴 세션 안정성)
      const elapsed = Date.now() - this.sessionStartedAt;
      if (elapsed >= this.cfg.maxSessionMs) {
        this.buffer = "";
        this.sessionStartedAt = Date.now();
      }

      // 끊김 시 즉시 재시작
      if (this.cfg.autoRestart) {
        ASR.start({
          lang: this.cfg.lang,
          interimResults: this.cfg.interimResults,
          continuous: this.cfg.continuous,
        });
      }
    };

    const onError = () => {
      if (!this.recognizing) return;
      if (this.cfg.autoRestart) {
        ASR.abort();
        ASR.start({
          lang: this.cfg.lang,
          interimResults: this.cfg.interimResults,
          continuous: this.cfg.continuous,
        });
      }
    };

    this.subs.push(
      ASR.addListener("result", onResult),
      ASR.addListener("end", onEnd),
      ASR.addListener("error", onError)
    );
  }

  private detachEvents() {
    this.subs.forEach((s) => s?.remove?.());
    this.subs = [];
  }

  async start(config?: Partial<ASRConfig>) {
    if (this.recognizing) return;
    if (config) this.cfg = { ...this.cfg, ...config };

    const perm = await ASR.requestPermissionsAsync();
    if (!perm.granted) throw new Error("마이크/음성 인식 권한이 필요합니다.");

    this.buffer = "";
    this.sessionStartedAt = Date.now();
    this.attachEvents();

    await ASR.start({
      lang: this.cfg.lang,
      interimResults: this.cfg.interimResults,
      continuous: this.cfg.continuous,
    });

    this.recognizing = true;
  }

  async stop() {
    if (!this.recognizing) return;
    this.recognizing = false;
    try {
      await ASR.stop();
    } finally {
      this.detachEvents();
    }
  }

  abort() {
    this.recognizing = false;
    try {
      ASR.abort();
    } finally {
      this.detachEvents();
    }
  }

  isRecognizing() {
    return this.recognizing;
  }

  getBufferedText() {
    return this.buffer;
  }
}

export const asrService = new ASRService();
export type { Listener };
