import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  AccessibilityInfo,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettingsStore } from '../stores/appSettingsStore';
import { PlayMode } from '../types/playMode';
import * as Haptics from 'expo-haptics';

interface PlayerSettingsModalProps {
  visible: boolean;
  currentPlayMode: PlayMode;
  onPlayModeChange: (mode: PlayMode) => void;
  onBookmarkToggle: () => void;
  isBookmarked: boolean;
  onClose: () => void;
}

export default function PlayerSettingsModal({
  visible,
  currentPlayMode,
  onPlayModeChange,
  onBookmarkToggle,
  isBookmarked,
  onClose,
}: PlayerSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { settings, setTTSRate } = useAppSettingsStore();

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        AccessibilityInfo.announceForAccessibility(
          '학습 옵션 메뉴가 열렸습니다. 재생 모드, 속도, 저장을 변경할 수 있습니다.'
        );
      }, 300);
    }
  }, [visible]);

  const handlePlayModeChange = (mode: PlayMode) => {
    onPlayModeChange(mode);
    Haptics.selectionAsync();
    const modeLabels = {
      single: '한 섹션씩',
      continuous: '연속 재생',
      repeat: '반복 재생',
    };
    AccessibilityInfo.announceForAccessibility(
      `${modeLabels[mode]} 모드로 변경되었습니다`
    );
  };

  const handleSpeedChange = (speed: number) => {
    setTTSRate(speed);
    Haptics.selectionAsync();
    AccessibilityInfo.announceForAccessibility(
      `재생 속도가 ${speed.toFixed(1)}배로 변경되었습니다`
    );
  };

  const handleBookmarkToggle = () => {
    onBookmarkToggle();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility(
      isBookmarked ? '저장을 해제했습니다' : '현재 위치를 저장했습니다'
    );
  };

  const handleClose = () => {
    Haptics.selectionAsync();
    AccessibilityInfo.announceForAccessibility('학습 옵션 메뉴를 닫습니다');
    onClose();
  };

  const speedOptions = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];

  // 현재 ttsRate와 가장 가까운 speedOption을 찾습니다.
  // 사용자가 다른 곳에서 설정한 속도(e.g., 1.1x)가 옵션에 없을 경우를 대비합니다.
  const findClosestSpeed = (rate: number, options: number[]) => {
    return options.reduce((prev, curr) => {
      return Math.abs(curr - rate) < Math.abs(prev - rate) ? curr : prev;
    });
  };

  const selectedSpeed = findClosestSpeed(settings.ttsRate, speedOptions);

  const playModeOptions: Array<{ key: PlayMode; label: string; description: string }> = [
    { key: 'single', label: '한 섹션씩', description: '섹션을 하나씩 끊어서 재생합니다' },
    { key: 'continuous', label: '연속 재생', description: '챕터 전체를 이어서 재생합니다' },
    { key: 'repeat', label: '반복 재생', description: '현재 섹션을 반복해서 재생합니다' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={false}
      accessibilityViewIsModal={true}
    >
      <Pressable                                                          
        style={styles.modalOverlay}
        onPress={handleClose}
        accessible={false}
      >
        <Pressable
          style={[styles.modalContent, { paddingBottom: insets.bottom }]}
          onStartShouldSetResponder={() => true} // 모달 내부 터치 시 닫힘 방지
        >
          {/* 헤더 */}
          <View style={styles.modalHeader}>
            <Text
              style={styles.modalTitle}
              accessible={true}
              accessibilityRole="header"
            >
              학습 옵션
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessible={true}
              accessibilityLabel="닫기"
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 }]}
          >
            {/* 1. 북마크 (가장 자주 사용) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>현재 위치</Text>
              <TouchableOpacity
                style={[styles.bookmarkButton, isBookmarked && styles.bookmarkButtonActive]}
                onPress={handleBookmarkToggle}
                accessible={true}
                accessibilityLabel={isBookmarked ? '저장 해제하기' : '이 위치 저장하기'}
                accessibilityHint={
                  isBookmarked
                    ? '현재 위치의 저장을 해제합니다'
                    : '현재 학습 위치를 북마크에 저장합니다'
                }
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.bookmarkButtonText,
                    isBookmarked && styles.bookmarkButtonTextActive,
                  ]}
                >
                  {isBookmarked ? '저장됨 (탭하여 해제)' : '이 위치 저장하기'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 구분선 */}
            <View style={styles.divider} />

            {/* 2. 재생 속도 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>재생 속도</Text>
              <View style={styles.speedGrid}>
                {speedOptions.map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={[styles.speedButton, selectedSpeed === speed && styles.speedButtonActive]}
                    onPress={() => handleSpeedChange(speed)}
                    accessible={true}
                    accessibilityLabel={`${speed.toFixed(1)}배속`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedSpeed === speed }}
                  >
                    <Text style={[styles.speedButtonText, selectedSpeed === speed && styles.speedButtonTextActive]}>
                      {speed.toFixed(1)}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 구분선 */}
            <View style={styles.divider} />

            {/* 3. 재생 모드 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>재생 모드</Text>
              {playModeOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionButton,
                    currentPlayMode === option.key && styles.optionButtonActive,
                  ]}
                  onPress={() => handlePlayModeChange(option.key)}
                  accessible={true}
                  accessibilityLabel={option.label}
                  accessibilityHint={option.description}
                  accessibilityRole="button"
                  accessibilityState={{ selected: currentPlayMode === option.key }}
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        currentPlayMode === option.key && styles.optionLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionDescription,
                        currentPlayMode === option.key && styles.optionDescriptionActive,
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                  {currentPlayMode === option.key && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView> 
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  // 모달 높이 및 하단 여백 조정 (useSafeAreaInsets로 동적 처리)
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    minHeight: 48,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
  },
  scrollView: {
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20, 
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  divider: {
    height: 2,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },

  // 재생 모드 옵션
  optionButton: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minHeight: 80,
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 4,
  },
  optionLabelActive: {
    color: '#0D47A1',
  },
  optionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#757575',
  },
  optionDescriptionActive: {
    color: '#1976D2',
  },
  checkmark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginLeft: 12,
  },
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  speedButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  speedButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#424242',
  },
  speedButtonTextActive: {
    color: '#0D47A1',
  },
  bookmarkButton: {
    paddingVertical: 22,
    paddingHorizontal: 24,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FF9500',
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#43A047',
  },
  bookmarkButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E68A00',
    textAlign: 'center',
  },
  bookmarkButtonTextActive: {
    color: '#1B5E20',
  },
});