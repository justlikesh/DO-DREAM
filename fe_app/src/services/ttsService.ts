import * as Speech from 'expo-speech';
import { Section } from '../types/chapter';
import { PlayMode } from '../types/playMode';

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'stopped';

export interface PauseSettings {
  heading: number;
  paragraph: number;
  formula: number;
  imageDescription: number;
  default: number;
}

export interface TTSOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  voice?: string;
  pauseSettings?: Partial<PauseSettings>;
  playMode?: PlayMode;
  repeatCount?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  onBoundary?: (event: { charIndex: number; charLength: number }) => void;
  onSectionChange?: (index: number) => void;
  onSectionComplete?: () => void;
}

class TTSService {
  private currentSectionIndex: number = 0;
  private sections: Section[] = [];
  private status: TTSStatus = 'idle';
  private options: TTSOptions = {};
  private playMode: PlayMode = 'single';
  private currentRepeatCount: number = 0;
  private targetRepeatCount: number = 2;

  // 안정성 향상: 콜백 레이스 방지용 토큰 & 지연 타이머
  private speakToken: number = 0;
  private pauseAfterTimer: ReturnType<typeof setTimeout> | null = null;

  private defaultPauseSettings: PauseSettings = {
    heading: 1500,
    paragraph: 800,
    formula: 1200,
    imageDescription: 1000,
    default: 500,
  };

  initialize(sections: Section[], startIndex: number = 0, options: TTSOptions = {}) {
    this.sections = sections;
    this.currentSectionIndex = startIndex;
    this.playMode = options.playMode || 'single';
    this.targetRepeatCount = options.repeatCount ?? 2;
    this.currentRepeatCount = 0;

    this.options = {
      language: 'ko-KR',
      pitch: 1.0,
      rate: 1.0,
      volume: 1.0,
      pauseSettings: { ...this.defaultPauseSettings },
      ...options,
    };
    this.status = 'idle';

    // 초기화 시 기존 예약 타이머/토큰 정리
    this.clearPauseAfterTimer();
    this.bumpSpeakToken();
  }

  private bumpSpeakToken() {
    this.speakToken++;
  }

  private clearPauseAfterTimer() {
    if (this.pauseAfterTimer) {
      clearTimeout(this.pauseAfterTimer);
      this.pauseAfterTimer = null;
    }
  }

  private getPauseTime(sectionType: Section['type']): number {
    const settings = this.options.pauseSettings || this.defaultPauseSettings;
    const rate = this.options.rate || 1.0;

    let basePause: number;
    switch (sectionType) {
      case 'heading':
        basePause = settings.heading ?? this.defaultPauseSettings.heading;
        break;
      case 'paragraph':
        basePause = settings.paragraph ?? this.defaultPauseSettings.paragraph;
        break;
      case 'formula':
        basePause = settings.formula ?? this.defaultPauseSettings.formula;
        break;
      case 'image_description':
        basePause = settings.imageDescription ?? this.defaultPauseSettings.imageDescription;
        break;
      default:
        basePause = settings.default ?? this.defaultPauseSettings.default;
    }

    // 재생 속도에 반비례
    return Math.round(basePause / rate);
  }

  async play(): Promise<void> {
    if (this.sections.length === 0) {
      console.warn('No sections to play');
      return;
    }

    // 이미 실제로 말하는 중이면 중복 재생 방지
    if (this.status === 'playing') {
      try {
        if (await Speech.isSpeakingAsync()) return;
      } catch {}
    }

    if (this.status === 'paused') {
      await Speech.resume();
      this.status = 'playing';
      return;
    }

    if (this.currentSectionIndex >= this.sections.length) {
      this.status = 'stopped';
      return;
    }

    const currentSection = this.sections[this.currentSectionIndex];
    this.status = 'playing';

    const pauseAfter = this.getPauseTime(currentSection.type);
    const myToken = ++this.speakToken; // 이 호출에 대한 토큰

    try {
      await Speech.speak(currentSection.text, {
        language: this.options.language,
        pitch: this.options.pitch,
        rate: this.options.rate,
        volume: this.options.volume,
        voice: this.options.voice,
        onStart: () => {
          // 토큰 검사: 기존 호출 잔여 콜백 무시
          if (this.speakToken !== myToken) return;
          this.status = 'playing';
          this.options.onStart?.();
        },
        onDone: () => {
          if (this.speakToken !== myToken) return;
          // 섹션 종료 후 지연을 주고 다음 단계
          this.clearPauseAfterTimer();
          if (pauseAfter > 0) {
            this.pauseAfterTimer = setTimeout(() => {
              if (this.speakToken !== myToken) return;
              this.handleDone();
            }, pauseAfter);
          } else {
            this.handleDone();
          }
        },
        onError: (error) => {
          if (this.speakToken !== myToken) return;
          this.status = 'idle';
          const errorMessage =
            typeof error === 'string' ? error : (error as any)?.message || 'TTS error occurred';
          this.options.onError?.(new Error(errorMessage));
        },
        onBoundary: this.options.onBoundary,
      });
    } catch (error) {
      // speak 호출 자체가 실패
      this.status = 'idle';
      this.options.onError?.(error as Error);
    }
  }

  private handleDone(): void {
    switch (this.playMode) {
      case 'single':
        // Single 모드: 섹션 완료 후 idle 상태로 전환
        // 사용자가 재생 버튼을 누르면 현재 섹션을 다시 재생할 수 있음
        this.status = 'idle';
        this.options.onSectionComplete?.();
        break;

      case 'repeat':
        this.currentRepeatCount++;
        if (this.currentRepeatCount < this.targetRepeatCount) {
          // 같은 섹션 반복
          this.play();
        } else {
          this.currentRepeatCount = 0;
          this.moveToNextSection();
        }
        break;

      case 'continuous':
      default:
        this.moveToNextSection();
        break;
    }
  }

  private moveToNextSection(): void {
    if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      this.options.onSectionChange?.(this.currentSectionIndex);
      this.play();
    } else {
      this.status = 'idle';
      this.options.onDone?.();
    }
  }

  async pause(): Promise<void> {
    if (this.status === 'playing') {
      this.clearPauseAfterTimer();
      await Speech.pause();
      this.status = 'paused';
    }
  }

  async resume(): Promise<void> {
    if (this.status === 'paused') {
      await Speech.resume();
      this.status = 'playing';
    }
  }

  async stop(): Promise<void> {
    this.clearPauseAfterTimer();
    this.bumpSpeakToken(); // 이후 들어올 onDone 무시
    await Speech.stop();
    this.status = 'stopped';
    this.currentRepeatCount = 0;
    // 섹션 인덱스는 유지(재개를 위해)
  }

  async goToSection(index: number, autoPlay: boolean = false): Promise<void> {
    if (index < 0 || index >= this.sections.length) {
      console.warn('Invalid section index');
      return;
    }

    await this.stop();
    this.currentSectionIndex = index;
    this.currentRepeatCount = 0;
    this.options.onSectionChange?.(index);

    if (autoPlay) {
      await this.play();
    }
  }

  async previous(): Promise<void> {
    if (this.currentSectionIndex > 0) {
      await this.goToSection(this.currentSectionIndex - 1, true);
    }
  }

  async next(): Promise<void> {
    if (this.currentSectionIndex < this.sections.length - 1) {
      await this.goToSection(this.currentSectionIndex + 1, true);
    }
  }

  /**
   * 재생 속도 변경.
   * - 항상 옵션 값을 갱신
   * - 재생/일시정지 상태에서도 현재 섹션에 즉시 반영되도록 재시작 처리
   *   (expo-speech는 진행 중 rate 변경이 즉시 반영되지 않을 수 있음)
   */
  async setRate(rate: number): Promise<void> {
    this.options.rate = rate;

    if (this.status === 'playing' || this.status === 'paused') {
      const wasPlaying = this.status === 'playing';
      const currentIndex = this.currentSectionIndex;

      // 진행 중 예약된 후처리 제거 & 토큰 증가로 기존 콜백 무효화
      this.clearPauseAfterTimer();
      this.bumpSpeakToken();

      // 말하던 걸 멈추고 동일 섹션을 새 속도로 다시 시작
      await Speech.stop();
      this.status = 'idle';

      // 바로 같은 섹션 재생
      this.currentSectionIndex = currentIndex;
      if (wasPlaying) {
        await this.play();
      } else {
        // 일시정지 상태였다면 재생은 하지 않되 상태 유지
        // (필요시 resume()에서 새 속도로 시작됨)
        this.status = 'paused';
      }
    }
  }

  setPauseSettings(settings: Partial<PauseSettings>): void {
    this.options.pauseSettings = {
      ...this.defaultPauseSettings,
      ...this.options.pauseSettings,
      ...settings,
    };
  }

  setPlayMode(mode: PlayMode, repeatCount?: number): void {
    this.playMode = mode;
    if (repeatCount !== undefined) {
      this.targetRepeatCount = repeatCount;
    }
    this.currentRepeatCount = 0;
  }

  getPlayMode(): PlayMode {
    return this.playMode;
  }

  getStatus(): TTSStatus {
    return this.status;
  }

  getCurrentSectionIndex(): number {
    return this.currentSectionIndex;
  }

  getSections(): Section[] {
    return this.sections;
  }

  async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.filter((voice) => voice.language?.startsWith('ko'));
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }

  async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch {
      return false;
    }
  }

  cleanup(): void {
    this.clearPauseAfterTimer();
    this.bumpSpeakToken();
    Speech.stop();
    this.sections = [];
    this.currentSectionIndex = 0;
    this.status = 'idle';
    this.options = {};
    this.currentRepeatCount = 0;
  }
}

const ttsService = new TTSService();
export default ttsService;