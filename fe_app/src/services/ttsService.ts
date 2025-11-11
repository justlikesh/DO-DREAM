import Tts from 'react-native-tts';
import { Section } from '../types/chapter';
import { PlayMode } from '../types/playMode';
import { Platform } from 'react-native';

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

  private speakToken: number = 0;
  private pauseAfterTimer: ReturnType<typeof setTimeout> | null = null;
  
  private isTtsInitialized: boolean = false; 

  private defaultPauseSettings: PauseSettings = {
    heading: 1500,
    paragraph: 800,
    formula: 1200,
    imageDescription: 1000,
    default: 500,
  };

  constructor() {
    this.setupTtsListeners();
    this.initializeTtsEngine();
  }

  private setupTtsListeners() {
    Tts.addEventListener('tts-start', (event) => {
    });

    Tts.addEventListener('tts-finish', (event) => {
        console.log('[TTS-Engine] tts-finish event fired');
    });

    Tts.addEventListener('tts-error', (event) => {
        console.error('[TTS-Engine] tts-error event fired:', event);
        this.status = 'idle';
        this.options.onError?.(new Error((event as any).message || 'TTS Engine Error'));
    });
  }

  private async initializeTtsEngine() {
    try {
      if (Platform.OS === 'android') {
      }
      
      await Tts.getInitStatus();
      this.isTtsInitialized = true;
      console.log('[TTS] Tts Engine Initialized.');

      const initialOptions = this.getOptions();
      await Tts.setDefaultLanguage(initialOptions.language || 'ko-KR');
      await Tts.setDefaultRate(initialOptions.rate || 1.0);
      await Tts.setDefaultPitch(initialOptions.pitch || 1.0);
      
    } catch (error) {
      console.error('[TTS] Failed to initialize Tts Engine:', error);
      this.isTtsInitialized = false;
    }
  }

  async initialize(sections: Section[], startIndex: number = 0, options: TTSOptions = {}): Promise<void> {
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

    this.clearPauseAfterTimer();
    this.bumpSpeakToken();
    
    if (this.isTtsInitialized) {
        await this.applyTtsOptions(this.options);
    }
    
    console.log('[TTS] Initialized with options:', this.options);
  }

  private async applyTtsOptions(options: TTSOptions) {
      if (options.language) await Tts.setDefaultLanguage(options.language);
      if (options.rate !== undefined) await Tts.setDefaultRate(options.rate);
      if (options.pitch !== undefined) await Tts.setDefaultPitch(options.pitch);
      if (options.voice) await Tts.setDefaultVoice(options.voice);
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

    return Math.round(basePause / rate);
  }

  async play(): Promise<void> {
    if (this.sections.length === 0) {
      console.warn('[TTS] No sections to play');
      return;
    }
    if (!this.isTtsInitialized) {
      console.warn('[TTS] Tts Engine not initialized yet.');
      return;
    }

    if (this.currentSectionIndex >= this.sections.length) {
      this.status = 'stopped';
      return;
    }

    const currentSection = this.sections[this.currentSectionIndex];
    this.status = 'playing';

    console.log('=== TTS Play Debug ===');
    console.log('Section index:', this.currentSectionIndex);
    console.log('Rate:', this.options.rate);
    console.log('Volume:', this.options.volume);
    console.log('Pitch:', this.options.pitch);
    console.log('Voice:', this.options.voice);

    const pauseAfter = this.getPauseTime(currentSection.type);
    const myToken = ++this.speakToken;

    try {
      console.log('[TTS] Calling Tts.speak()...');

      await this.applyTtsOptions(this.options);

      Tts.speak(currentSection.text, {
        iosVoiceId: this.options.voice || '',
        rate: this.options.rate || 1.0,
        androidParams: {
          KEY_PARAM_STREAM: 'STREAM_MUSIC',
          KEY_PARAM_VOLUME: this.options.volume || 1.0,
          KEY_PARAM_PAN: 0,
        },
      });
      
      console.log('[TTS] Tts.speak() call initiated successfully');
      
      this.status = 'playing';
      this.options.onStart?.();

      await this.waitForTtsFinish(myToken, pauseAfter);

    } catch (error) {
      console.error('[TTS] ✗ Tts.speak() threw error:', error);
      this.status = 'idle';
      this.options.onError?.(error as Error);
    }
  }
  
  private async waitForTtsFinish(token: number, pauseAfter: number): Promise<void> {
      try {
          await new Promise<void>((resolve, reject) => {
              let finishListener: any = null;
              let errorListener: any = null;

              finishListener = (event: any) => {
                  Tts.removeAllListeners('tts-finish');
                  Tts.removeAllListeners('tts-error');
                  resolve();
              };

              errorListener = (event: any) => {
                  Tts.removeAllListeners('tts-finish');
                  Tts.removeAllListeners('tts-error');
                  reject(new Error(event.message || 'TTS Error'));
              };

              Tts.addEventListener('tts-finish', finishListener);
              Tts.addEventListener('tts-error', errorListener);
          });

          if (this.speakToken !== token) return;
          console.log('[TTS] ✓ Tts playback finished');

          this.clearPauseAfterTimer();
          if (pauseAfter > 0) {
              this.pauseAfterTimer = setTimeout(() => {
                  if (this.speakToken !== token) return;
                  this.handleDone();
              }, pauseAfter);
          } else {
              this.handleDone();
          }
      } catch (error) {
          if (this.speakToken !== token) return;
          console.error('[TTS] ✗ Tts playback error:', error);
          this.status = 'idle';
          this.options.onError?.(error as Error);
      }
  }


  private handleDone(): void {
    switch (this.playMode) {
      case 'single':
        this.status = 'idle';
        this.options.onSectionComplete?.();
        break;

      case 'repeat':
        this.currentRepeatCount++;
        if (this.currentRepeatCount < this.targetRepeatCount) {
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
      try {
        await Tts.stop();
        this.status = 'paused';
        console.log('[TTS] Paused (stopped)');
      } catch (error) {
        console.warn('[TTS] Pause failed:', error);
        this.status = 'paused';
      }
    }
  }

  async resume(): Promise<void> {
    if (this.status === 'paused') {
      try {
        console.log('[TTS] Resuming (replaying)');
        await this.play();
      } catch (error) {
        console.warn('[TTS] Resume failed:', error);
      }
    }
  }

  async stop(): Promise<void> {
    this.clearPauseAfterTimer();
    this.bumpSpeakToken();
    await Tts.stop();
    this.status = 'stopped';
    this.currentRepeatCount = 0;
    console.log('[TTS] Stopped');
  }

  async goToSection(index: number, autoPlay: boolean = false): Promise<void> {
    if (index < 0 || index >= this.sections.length) {
      console.warn('[TTS] Invalid section index:', index);
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

  private async updateAndReplay(callback: () => void): Promise<void> {
    if (!this.isTtsInitialized) {
        console.warn('[TTS] Tts Engine not initialized, skipping updateAndReplay.');
        callback();
        return;
    }
    
    const wasPlaying = this.status === 'playing';
    const currentIndex = this.currentSectionIndex;

    this.clearPauseAfterTimer();
    this.bumpSpeakToken();

    await Tts.stop();
    this.status = 'idle';

    callback();
    await this.applyTtsOptions(this.options);

    this.currentSectionIndex = currentIndex;
    if (wasPlaying) {
      await this.play();
    } else {
      this.status = 'idle';
    }
  }

  async setRate(rate: number): Promise<void> {
    console.log('[TTS] Rate changed to:', rate);
    await this.updateAndReplay(() => {
        this.options.rate = rate;
    });
  }

  async setPitch(pitch: number): Promise<void> {
    console.log('[TTS] Pitch changed to:', pitch);
    await this.updateAndReplay(() => {
      this.options.pitch = pitch;
    });
  }

  setVolume(volume: number): void {
    this.options.volume = volume;
    console.log('[TTS] Volume changed to:', volume);
  }

  setLanguage(language: string): void {
    this.options.language = language;
    console.log('[TTS] Language changed to:', language);
  }

  async setVoice(voice: string): Promise<void> {
    console.log('[TTS] Voice changed to:', voice);
    await this.updateAndReplay(() => {
      this.options.voice = voice;
    });
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
    console.log('[TTS] Play mode changed to:', mode);
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
  
  getOptions(): TTSOptions {
    return this.options;
  }

  /**
   * 목소리 이름을 사용자 친화적인 한국어로 변환 (통일된 형식)
   */
  private getVoiceDisplayName(voiceId: string, voiceName: string, index: number): string {
    // 디버깅용 로그
    console.log(`[TTS] Processing voice: id=${voiceId}, name=${voiceName}`);
    
    // 삼성 TTS 목소리 ID 패턴 처리 (SMTl = 여성, SMTm = 남성, SMTh = 고음)
    if (voiceId.includes('SMT')) {
      const match = voiceId.match(/SMT([lmh])(\d+)/);
      if (match) {
        const [, gender, num] = match;
        const genderName = gender === 'l' ? '여성' : 
                          gender === 'm' ? '남성' : 
                          gender === 'h' ? '고음' : '목소리';
        // 두 자리 숫자로 통일 (01, 02, 03...)
        const paddedNum = num.padStart(2, '0');
        return `${genderName} ${paddedNum}`;
      }
    }

    // Google TTS 패턴 처리
    if (voiceId.includes('Google') || voiceName.includes('Google')) {
      const match = voiceId.match(/(female|male|woman|man)[\s-]?(\d*)/i);
      if (match) {
        const [, gender, num] = match;
        const genderName = gender.toLowerCase().includes('f') || 
                          gender.toLowerCase().includes('w') ? '여성' : '남성';
        if (num) {
          const paddedNum = num.padStart(2, '0');
          return `${genderName} ${paddedNum}`;
        }
        return `${genderName} ${String(index + 1).padStart(2, '0')}`;
      }
      return `구글 ${String(index + 1).padStart(2, '0')}`;
    }

    // 기타 목소리: 번호를 두 자리로 통일
    const paddedIndex = String(index + 1).padStart(2, '0');
    return `목소리 ${paddedIndex}`;
  }

  async getAvailableVoices(): Promise<{ id: string; name: string; language: string; quality: number; default?: boolean }[]> {
    try {
      if (!this.isTtsInitialized) {
        await this.initializeTtsEngine();
      }
      const voices = await Tts.voices();
      const koVoices = voices.filter((voice) => voice.language?.startsWith('ko'));
      
      console.log('[TTS] Available Korean voices:', koVoices.length);
      console.log('[TTS] Raw voice data:', koVoices.map(v => ({ id: v.id, name: v.name })));
      
      // 목소리 이름을 사용자 친화적으로 변환 (통일된 형식)
      const processedVoices = koVoices.map((v, index) => ({
        id: v.id,
        name: this.getVoiceDisplayName(v.id, v.name, index),
        language: v.language,
        quality: v.quality,
        default: index === 0,
      }));
      
      console.log('[TTS] Processed voice names:', processedVoices.map(v => v.name));
      
      return processedVoices;
    } catch (error) {
      console.error('[TTS] Failed to get voices:', error);
      return [];
    }
  }

  async isSpeaking(): Promise<boolean> {
    return this.status === 'playing';
  }

  cleanup(): void {
    this.clearPauseAfterTimer();
    this.bumpSpeakToken();
    Tts.stop();
    
    Tts.removeAllListeners('tts-start');
    Tts.removeAllListeners('tts-finish');
    Tts.removeAllListeners('tts-error');
    
    this.sections = [];
    this.currentSectionIndex = 0;
    this.status = 'idle';
    this.options = {};
    this.currentRepeatCount = 0;
    console.log('[TTS] Cleaned up');
  }
}

const ttsService = new TTSService();
export default ttsService;