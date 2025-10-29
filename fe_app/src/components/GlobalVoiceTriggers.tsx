import React, { useContext } from 'react';
import { Platform, AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useScreenReaderEnabled } from '../hooks/useAccessibilityTriggers';
import MagicTapCatcher from './MagicTapCatcher';
import AndroidVolumeDoublePress from './AndroidVolumeDoublePress';
import { TriggerContext } from '../triggers/TriggerContext';

type Props = {
  onVoiceCommand: () => void;
};

export default function GlobalVoiceTriggers({ onVoiceCommand }: Props) {
  const srEnabled = useScreenReaderEnabled();
  const { mode, getPlayPause } = useContext(TriggerContext);

  const fireVoice = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility('질문하기로 이동합니다');
    onVoiceCommand();
  };

  const firePlayPause = () => {
    const fn = getPlayPause();
    if (fn) fn();
    // 재생/정지 토글은 내부 핸들러에서 announce/haptic 처리
  };

  // iOS: Magic Tap 라우팅
  const onMagicTap = () => {
    if (mode === 'playpause') firePlayPause();
    else if (mode === 'voice') fireVoice();
  };

  // Android: 볼륨 업 더블=질문 / 볼륨 다운 더블=재생(플레이어에서만)
  const androidOverlay =
    Platform.OS === 'android' ? (
      <AndroidVolumeDoublePress
        enabled={!srEnabled}
        onVolumeUpDouble={fireVoice}
        onVolumeDownDouble={mode === 'playpause' ? firePlayPause : undefined}
      />
    ) : null;

  return (
    <MagicTapCatcher
      onMagicTap={onMagicTap}
      style={{ position: 'absolute', inset: 0, backgroundColor: 'transparent' }}
      pointerEvents="none" // 화면 조작 방해 없음 (접근성 액션만 수신)
    >
      {androidOverlay}
    </MagicTapCatcher>
  );
}
