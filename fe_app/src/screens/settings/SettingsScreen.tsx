import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ttsService from '../../services/ttsService';
import { useAuthStore } from '../../stores/authStore';
import Tts from 'react-native-tts';
import { 
    getTTSSpeed, saveTTSSpeed,
    getTTSPitch, saveTTSPitch,
    getTTSVolume, saveTTSVolume,
    getTTSVoiceId, saveTTSVoiceId,
    getHighContrastMode, saveHighContrastMode,
    getFontSizeScale, saveFontSizeScale
} from '../../services/appStorage';

// --- 설정 값 타입 정의 ---
export interface AppSettings {
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  ttsVoiceId: string | null;
  highContrastMode: boolean;
  fontSizeScale: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  ttsVoiceId: null,
  highContrastMode: false,
  fontSizeScale: 1.2,
};

// --- MMKV 저장소 훅 ---
const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const loadSettings = useCallback(() => {
    const loadedSettings: AppSettings = {
        ttsRate: getTTSSpeed(),
        ttsPitch: getTTSPitch(),
        ttsVolume: getTTSVolume(),
        ttsVoiceId: getTTSVoiceId(),
        highContrastMode: getHighContrastMode(),
        fontSizeScale: getFontSizeScale() || 1.2,
    };
    
    setSettings(loadedSettings);
    
    ttsService.setRate(loadedSettings.ttsRate);
    ttsService.setPitch(loadedSettings.ttsPitch);
    ttsService.setVolume(loadedSettings.ttsVolume);
    if (loadedSettings.ttsVoiceId) {
        ttsService.setVoice(loadedSettings.ttsVoiceId);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    saveTTSSpeed(newSettings.ttsRate);
    saveTTSPitch(newSettings.ttsPitch);
    saveTTSVolume(newSettings.ttsVolume);
    if (newSettings.ttsVoiceId) saveTTSVoiceId(newSettings.ttsVoiceId);
    saveHighContrastMode(newSettings.highContrastMode);
    saveFontSizeScale(newSettings.fontSizeScale);
    
    setSettings(newSettings);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, saveSettings, loadSettings };
};

// --- 메인 컴포넌트 ---
export default function SettingsScreen() {
  const navigation = useNavigation();
  const { settings, saveSettings } = useSettings();
  const [availableVoices, setAvailableVoices] = useState<{ id: string; name: string; language: string; quality: number; default?: boolean }[]>([]);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const loadVoices = async () => {
      const voices = await ttsService.getAvailableVoices();
      
      console.log('[Settings] Original voices:', voices.map(v => ({ id: v.id, name: v.name })));
      
      setAvailableVoices(voices);

      if (!settings.ttsVoiceId && voices.length > 0) {
          handleSettingChange('ttsVoiceId', voices[0].id);
      }
    };
    loadVoices();
  }, []); 

  const handleSettingChange = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    await saveSettings(newSettings);

    if (key === 'ttsRate') {
      await ttsService.setRate(value as number);
      AccessibilityInfo.announceForAccessibility(`${value}배`);
    } else if (key === 'ttsPitch') {
      await ttsService.setPitch(value as number);
      AccessibilityInfo.announceForAccessibility(`${(value as number).toFixed(1)}`);
    } else if (key === 'ttsVolume') {
      ttsService.setVolume(value as number);
      AccessibilityInfo.announceForAccessibility(`${Math.round((value as number) * 100)}퍼센트`);
    } else if (key === 'ttsVoiceId') {
      await ttsService.setVoice(value as string);
      const voiceName = availableVoices.find(v => v.id === value)?.name || '선택됨';
      AccessibilityInfo.announceForAccessibility(`${voiceName}`);
    } else if (key === 'highContrastMode') {
      AccessibilityInfo.announceForAccessibility(value ? '켜짐' : '꺼짐');
    } else if (key === 'fontSizeScale') {
       AccessibilityInfo.announceForAccessibility(`${Math.round((value as number) * 100)}퍼센트`);
    }
  }, [settings, saveSettings, availableVoices]);
  
  const handleTestTTS = async () => {
    const isSpeaking = await ttsService.isSpeaking();
    if (isSpeaking) {
      await ttsService.stop();
    }

    AccessibilityInfo.announceForAccessibility("테스트");

    try {
      const onFinish = () => {
        Tts.removeAllListeners('tts-finish');
        Tts.removeAllListeners('tts-error');
      };
      const onError = (error: any) => {
        Tts.removeAllListeners('tts-finish');
        Tts.removeAllListeners('tts-error');
        console.error("Test TTS Error:", error);
        AccessibilityInfo.announceForAccessibility("오류");
      };

      Tts.addEventListener('tts-finish', onFinish);
      Tts.addEventListener('tts-error', onError);

      Tts.speak("현재 설정으로 재생됩니다.", {
        iosVoiceId: settings.ttsVoiceId || '',
        rate: settings.ttsRate,
        androidParams: {
          KEY_PARAM_STREAM: 'STREAM_MUSIC',
          KEY_PARAM_VOLUME: settings.ttsVolume,
          KEY_PARAM_PAN: 0,
        },
      });
    } catch (error) {
      console.error("Test TTS Error:", error);
      AccessibilityInfo.announceForAccessibility("오류");
    }
  };
  
  const renderButtonControl = (
    label: string, 
    key: keyof AppSettings, 
    min: number, 
    max: number, 
    step: number,
    value: number,
    displayFormatter: (v: number) => string,
    unit: string
  ) => {
    const handleDecrease = () => {
      const newValue = Math.max(min, Number((value - step).toFixed(2)));
      handleSettingChange(key, newValue);
    };

    const handleIncrease = () => {
      const newValue = Math.min(max, Number((value + step).toFixed(2)));
      handleSettingChange(key, newValue);
    };

    const HC = settings.highContrastMode;
    const baseSize = 24;
    const scale = settings.fontSizeScale;

    return (
      <View style={styles.controlGroup}>
        <Text 
          style={[
            styles.controlLabel, 
            { fontSize: baseSize * scale },
            HC && styles.textHC
          ]}
          accessible={true}
          accessibilityRole="header"
        >
          {label}
        </Text>
        
        <View style={styles.btnRow}>
          <View 
            style={[styles.valueBox, HC && styles.valueBoxHC]}
            accessible={true}
            accessibilityLabel={`현재 ${label}`}
            accessibilityValue={{ text: `${displayFormatter(value)} ${unit}` }}
            accessibilityRole="text"
          >
            <Text style={[
              styles.valueNum, 
              { fontSize: (baseSize + 4) * scale },
              HC && styles.valueNumHC
            ]}>
              {displayFormatter(value)}
            </Text>
            <Text style={[
              styles.valueUnit,
              { fontSize: (baseSize - 4) * scale },
              HC && styles.valueNumHC
            ]}>
              {unit}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.ctrlBtn,
              value <= min && styles.ctrlBtnDisabled,
              HC && styles.ctrlBtnHC
            ]}
            onPress={handleDecrease}
            disabled={value <= min}
            accessible={true}
            accessibilityLabel="감소"
            accessibilityRole="button"
            accessibilityHint={`${label} 감소`}
            accessibilityState={{ disabled: value <= min }}
          >
            <Text style={[
              styles.ctrlBtnTxt,
              { fontSize: (baseSize + 16) * scale },
              value <= min && styles.ctrlBtnTxtDisabled,
              HC && styles.ctrlBtnTxtHC
            ]}>
              −
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.ctrlBtn,
              value >= max && styles.ctrlBtnDisabled,
              HC && styles.ctrlBtnHC
            ]}
            onPress={handleIncrease}
            disabled={value >= max}
            accessible={true}
            accessibilityLabel="증가"
            accessibilityRole="button"
            accessibilityHint={`${label} 증가`}
            accessibilityState={{ disabled: value >= max }}
          >
            <Text style={[
              styles.ctrlBtnTxt,
              { fontSize: (baseSize + 16) * scale },
              value >= max && styles.ctrlBtnTxtDisabled,
              HC && styles.ctrlBtnTxtHC
            ]}>
              +
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSwitch = (label: string, key: keyof AppSettings, value: boolean) => {
    const HC = settings.highContrastMode;
    const baseSize = 24;
    const scale = settings.fontSizeScale;

    return (
      <View style={styles.switchRow}>
        <Text 
          style={[
            styles.controlLabel,
            { fontSize: baseSize * scale },
            HC && styles.textHC
          ]}
        >
          {label}
        </Text>
        <Switch
          onValueChange={(v) => handleSettingChange(key, v)}
          value={value}
          trackColor={{ false: '#9E9E9E', true: '#4CAF50' }}
          thumbColor={value ? '#FFFFFF' : '#F5F5F5'}
          style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
          accessible={true}
          accessibilityLabel={label}
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          accessibilityValue={{ text: value ? '켜짐' : '꺼짐' }}
        />
      </View>
    );
  };

  const renderAction = (label: string, onPress: () => void, bg: string, border: string) => {
    const HC = settings.highContrastMode;
    const baseSize = 24;
    const scale = settings.fontSizeScale;

    return (
      <TouchableOpacity
        style={[
          styles.actionBtn,
          { backgroundColor: bg, borderColor: border },
          HC && styles.actionBtnHC
        ]}
        onPress={onPress}
        accessible={true}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Text style={[
          styles.actionTxt,
          { fontSize: baseSize * scale },
          HC && styles.actionTxtHC
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleGoBack = () => {
    AccessibilityInfo.announceForAccessibility("뒤로");
    navigation.goBack();
  };

  const HC = settings.highContrastMode;
  const baseSize = 24;
  const scale = settings.fontSizeScale;

  return (
    <SafeAreaView 
      style={[styles.container, HC && styles.containerHC]} 
      edges={['top']}  // ✅ bottom 제거 (스크롤 방해 방지)
    >
      {/* 헤더 */}
      <View style={[styles.header, HC && styles.headerHC]}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backBtn}
          accessible={true}
          accessibilityLabel="뒤로"
          accessibilityRole="button"
          accessibilityHint="설정 종료"
        >
          <Text style={[
            styles.backTxt,
            { fontSize: (baseSize + 4) * scale },
            HC && styles.textHC
          ]}>
            ← 뒤로
          </Text>
        </TouchableOpacity>
        <Text 
          style={[
            styles.headerTitle,
            { fontSize: (baseSize + 8) * scale },
            HC && styles.textHC
          ]}
          accessible={true}
          accessibilityRole="header"
        >
          설정
        </Text>
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // ✅ 키보드 회피 옵션 추가
        keyboardShouldPersistTaps="handled"
      >
        {/* 음성 설정 */}
        <View style={[styles.section, HC && styles.sectionHC]}>
          <Text 
            style={[
              styles.sectionTitle,
              { fontSize: (baseSize + 4) * scale },
              HC && styles.textHC
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            음성 설정
          </Text>

          {renderButtonControl('재생 속도', 'ttsRate', 0.5, 2.0, 0.1, settings.ttsRate, (v) => v.toFixed(1), '배')}
          {renderButtonControl('높낮이', 'ttsPitch', 0.5, 2.0, 0.1, settings.ttsPitch, (v) => v.toFixed(1), '')}
          {renderButtonControl('볼륨', 'ttsVolume', 0.0, 1.0, 0.1, settings.ttsVolume, (v) => Math.round(v * 100).toString(), '%')}

          {/* 음성 선택 */}
          <View style={styles.voiceSection}>
            <Text 
              style={[
                styles.controlLabel,
                { fontSize: baseSize * scale },
                HC && styles.textHC
              ]}
              accessible={true}
              accessibilityRole="header"
            >
              목소리
            </Text>
            
            <View style={styles.voiceList}>
              {availableVoices.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceBtn,
                    settings.ttsVoiceId === voice.id && styles.voiceBtnSel,
                    HC && settings.ttsVoiceId === voice.id && styles.voiceBtnSelHC,
                  ]}
                  onPress={() => handleSettingChange('ttsVoiceId', voice.id)}
                  accessible={true}
                  accessibilityLabel={voice.name}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: settings.ttsVoiceId === voice.id }}
                >
                  <Text style={[
                    styles.voiceTxt,
                    { fontSize: (baseSize - 2) * scale },
                    settings.ttsVoiceId === voice.id && styles.voiceTxtSel,
                    HC && settings.ttsVoiceId === voice.id && styles.voiceTxtSelHC,
                  ]}>
                    {voice.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderAction('테스트', handleTestTTS, '#FFC107', '#FFA000')}
        </View>

        {/* 화면 설정 */}
        <View style={[styles.section, HC && styles.sectionHC]}>
          <Text 
            style={[
              styles.sectionTitle,
              { fontSize: (baseSize + 4) * scale },
              HC && styles.textHC
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            화면 설정
          </Text>

          {renderSwitch('고대비 모드', 'highContrastMode', settings.highContrastMode)}
          {renderButtonControl('글자 크기', 'fontSizeScale', 0.8, 2.0, 0.1, settings.fontSizeScale, (v) => Math.round(v * 100).toString(), '%')}
        </View>

        {/* 앱 정보 */}
        <View style={[styles.section, HC && styles.sectionHC]}>
          <Text 
            style={[
              styles.sectionTitle,
              { fontSize: (baseSize + 4) * scale },
              HC && styles.textHC
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            앱 정보
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={[
              styles.infoLabel,
              { fontSize: (baseSize - 2) * scale },
              HC && styles.textHC
            ]}>
              버전
            </Text>
            <Text style={[
              styles.infoValue,
              { fontSize: (baseSize - 2) * scale },
              HC && styles.textHC
            ]}>
              1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- 스타일 ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  containerHC: { 
    backgroundColor: '#000000' 
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#E0E0E0',
  },
  headerHC: { 
    borderBottomColor: '#FFFFFF' 
  },
  backBtn: { 
    padding: 12, 
    minWidth: 80, 
    minHeight: 60, 
    justifyContent: 'center' 
  },
  backTxt: { 
    fontSize: 28, 
    color: '#2196F3', 
    fontWeight: '700' 
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
    marginRight: 80,
  },
  
  // ✅ ScrollView flex 보장
  scroll: { 
    flex: 1 
  },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 60,  // ✅ 하단 여백 충분히 확보
    flexGrow: 1  // ✅ 컨텐츠가 적어도 스크롤 가능하도록
  },
  
  section: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  sectionHC: { 
    backgroundColor: '#1A1A1A', 
    borderColor: '#FFFFFF' 
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#BDBDBD',
  },
  
  controlGroup: { 
    marginBottom: 28 
  },
  controlLabel: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#000000', 
    marginBottom: 16 
  },
  btnRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  
  valueBox: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 3,
    borderColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minHeight: 80,
    gap: 6,
  },
  valueBoxHC: { 
    backgroundColor: '#000000', 
    borderColor: '#FFEB3B' 
  },
  valueNum: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1565C0' 
  },
  valueNumHC: { 
    color: '#FFEB3B' 
  },
  valueUnit: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#1565C0' 
  },
  
  ctrlBtn: {
    width: 80,
    height: 80,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1565C0',
  },
  ctrlBtnHC: { 
    backgroundColor: '#FFEB3B', 
    borderColor: '#FBC02D' 
  },
  ctrlBtnDisabled: { 
    backgroundColor: '#BDBDBD', 
    borderColor: '#9E9E9E' 
  },
  ctrlBtnTxt: { 
    fontSize: 40, 
    fontWeight: 'bold', 
    color: '#FFFFFF' 
  },
  ctrlBtnTxtHC: { 
    color: '#000000' 
  },
  ctrlBtnTxtDisabled: { 
    color: '#E0E0E0' 
  },
  
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  
  voiceSection: { 
    marginBottom: 20,
  },
  voiceList: {
  },
  voiceBtn: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 12,
    borderWidth: 3,
    borderColor: '#90CAF9',
    minHeight: 70,
    justifyContent: 'center',
  },
  voiceBtnSel: { 
    backgroundColor: '#2196F3', 
    borderColor: '#1565C0' 
  },
  voiceBtnSelHC: { 
    backgroundColor: '#FFEB3B', 
    borderColor: '#FBC02D' 
  },
  voiceTxt: { 
    fontSize: 22, 
    color: '#1565C0', 
    fontWeight: '600', 
    textAlign: 'center' 
  },
  voiceTxtSel: { 
    color: '#FFFFFF', 
    fontWeight: 'bold' 
  },
  voiceTxtSelHC: { 
    color: '#000000' 
  },
  
  actionBtn: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 3,
    minHeight: 70,
  },
  actionBtnHC: { 
    backgroundColor: '#FFEB3B', 
    borderColor: '#FBC02D' 
  },
  actionTxt: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#000000' 
  },
  actionTxtHC: { 
    color: '#000000' 
  },
  
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  infoLabel: { 
    fontSize: 22, 
    color: '#666666', 
    fontWeight: '600' 
  },
  infoValue: { 
    fontSize: 22, 
    color: '#333333', 
    fontWeight: '600' 
  },
  
  textHC: { 
    color: '#FFFFFF' 
  },
});