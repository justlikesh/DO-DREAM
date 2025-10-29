import React from 'react';
import { View, AccessibilityActionEvent, ViewProps } from 'react-native';

type Props = ViewProps & {
  onMagicTap?: () => void;
  onEscape?: () => void;
};

export default function MagicTapCatcher({ onMagicTap, onEscape, ...rest }: Props) {
  return (
    <View
      accessible={true}
      accessibilityActions={[
        { name: 'magicTap' }, // iOS VoiceOver: 두 손가락 두 번 탭
        { name: 'escape' },   // iOS VoiceOver: 두 손가락 Z (뒤로가기)
      ]}
      onAccessibilityAction={(e: AccessibilityActionEvent) => {
        const name = e.nativeEvent.actionName;
        if (name === 'magicTap' && onMagicTap) onMagicTap();
        if (name === 'escape' && onEscape) onEscape();
      }}
      {...rest}
    />
  );
}
