import React, { useContext } from "react";
import { Platform, AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";
import MagicTapCatcher from "./MagicTapCatcher";
import AndroidVolumeDoublePress from "./AndroidVolumeDoublePress";
import { TriggerContext } from "../triggers/TriggerContext";

type Props = {
  /** 전역 음성 명령 시 이동할 화면 (질문하기) */
  onVoiceCommand: () => void;
};

export default function GlobalVoiceTriggers({ onVoiceCommand }: Props) {
  const {
    mode,
    getPlayPause,
    startVoiceCommandListening,
    stopVoiceCommandListening,
    isVoiceCommandListening,
    getTTSPlayRef,
    getTTSPauseRef,
  } = useContext(TriggerContext);

  // ================================
  // (1) 전역 음성 명령 시작
  // ================================
  const fireVoiceStart = async () => {
    if (isVoiceCommandListening) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility("음성 명령을 시작합니다.");
    await startVoiceCommandListening();
  };

  // ================================
  // (2) 전역 음성 명령 중지
  // ================================
  const fireVoiceStop = async () => {
    if (!isVoiceCommandListening) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    AccessibilityInfo.announceForAccessibility("음성 명령을 종료합니다.");
    await stopVoiceCommandListening();
  };

  // ================================
  // (3) PlayerScreen 전용 (mode === "playpause")
  // ================================
  const firePlay = () => {
    const fn = getTTSPlayRef();
    if (fn) {
      fn();
      AccessibilityInfo.announceForAccessibility("재생합니다.");
    }
  };

  const firePause = () => {
    const fn = getTTSPauseRef();
    if (fn) {
      fn();
      AccessibilityInfo.announceForAccessibility("일시정지합니다.");
    }
  };

  // ================================
  // (4) iOS — MagicTap(두 손가락 두 번 탭)
  // ================================
  const onMagicTap = () => {
    if (mode === "playpause") {
      const toggle = getPlayPause();
      if (toggle) toggle();
    } else {
      onVoiceCommand();
    }
  };

  // ================================
  // (5) Android - 볼륨키 멀티프레스
  // ================================
  const androidOverlay =
    Platform.OS === "android" ? (
      <AndroidVolumeDoublePress
        enabled={true}
        onVolumeUpPressCount={(count) => {
          if (count === 2) fireVoiceStart();
          else if (count === 3 && mode === "playpause") firePlay();
        }}
        onVolumeDownPressCount={(count) => {
          if (count === 2) fireVoiceStop();
          else if (count === 3 && mode === "playpause") firePause();
        }}
      />
    ) : null;

  return (
    <MagicTapCatcher
      onMagicTap={onMagicTap}
      style={{ position: "absolute", inset: 0, backgroundColor: "transparent" }}
      pointerEvents="none"
    >
      {androidOverlay}
    </MagicTapCatcher>
  );
}
