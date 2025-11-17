import React, { useEffect, useRef } from "react";
import { View } from "react-native";

// @ts-ignore
import KeyEvent from "react-native-keyevent";

const KEYCODE_VOLUME_UP = 24;
const KEYCODE_VOLUME_DOWN = 25;

type Props = {
  enabled: boolean;
  onVolumeUpPressCount?: (count: number) => void;
  onVolumeDownPressCount?: (count: number) => void;
  /**
   * 여러 번 누를 때 허용되는 최대 간격(ms)
   * 기본값: 350ms
   */
  windowMs?: number;
};

export default function AndroidVolumeDoublePress({
  enabled,
  onVolumeUpPressCount,
  onVolumeDownPressCount,
  windowMs = 350,
}: Props) {
  const upCount = useRef(0);
  const downCount = useRef(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      upCount.current = 0;
      downCount.current = 0;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };

    const flush = () => {
      if (upCount.current > 0 && onVolumeUpPressCount) {
        onVolumeUpPressCount(upCount.current);
      }
      if (downCount.current > 0 && onVolumeDownPressCount) {
        onVolumeDownPressCount(downCount.current);
      }
      reset();
    };

    const handleKeyDown = (event: { keyCode: number }) => {
      const { keyCode } = event;

      if (keyCode !== KEYCODE_VOLUME_UP && keyCode !== KEYCODE_VOLUME_DOWN) return;

      // 타이머 리셋 후 다시 시작
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, windowMs);

      // 카운트 증가
      if (keyCode === KEYCODE_VOLUME_UP) {
        upCount.current += 1;
      } else if (keyCode === KEYCODE_VOLUME_DOWN) {
        downCount.current += 1;
      }
    };

    KeyEvent.onKeyDownListener(handleKeyDown);

    return () => {
      try {
        KeyEvent.removeKeyDownListener();
      } catch {}
      reset();
    };
  }, [enabled, windowMs, onVolumeUpPressCount, onVolumeDownPressCount]);

  return <View accessible={false} />;
}
