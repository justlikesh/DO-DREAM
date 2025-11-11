import React, { useEffect } from 'react';
import {
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LibraryScreenNavigationProp } from '../../navigation/navigationTypes';
import { dummyMaterials } from '../../data/dummyMaterials';
import { Material } from '../../types/material';
import { useAuthStore } from '../../stores/authStore';
import { useAppSettingsStore } from '../../stores/appSettingsStore'; // ✅ Store 추가

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const student = useAuthStore((state) => state.student);
  const hydrate = useAuthStore((state) => state.hydrate);

  // 전역 설정 가져오기
  const settings = useAppSettingsStore((state) => state.settings);
  const hydrateSettings = useAppSettingsStore((state) => state.hydrate);

  // 컴포넌트 마운트 시 저장된 정보 불러오기
  useEffect(() => {
    hydrate();
    hydrateSettings();
  }, [hydrate, hydrateSettings]);

  const handleMaterialPress = (material: Material) => {
    console.log('선택한 교재:', material.title);
    navigation.navigate('PlaybackChoice', { material });
  };
  
  const handleSettingsPress = () => {
    AccessibilityInfo.announceForAccessibility("설정 화면으로 이동합니다.");
    navigation.navigate('Settings');
  };

  const renderMaterialButton = ({ item }: { item: Material }) => {
    const accessibilityLabel = `${item.title}, 현재 ${item.currentChapter}챕터, 전체 ${item.totalChapters}챕터 중. ${
      item.hasProgress ? '이어듣기 가능' : '처음부터 시작'
    }`;

    // 폰트 크기 동적 적용
    const baseFontSize = 24;
    const scaledFontSize = baseFontSize * settings.fontSizeScale;
    const scaledChapterFontSize = 18 * settings.fontSizeScale;

    return (
      <TouchableOpacity
        style={styles.materialButton}
        onPress={() => handleMaterialPress(item)}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint="두 번 탭하여 교재를 선택하세요"
      >
        <View style={styles.materialContent}>
          {/* 글자 크기 동적 적용 */}
          <Text style={[styles.subjectText, { fontSize: scaledFontSize }]}>
            {item.title}
          </Text>
          
          <Text style={[styles.chapterText, { fontSize: scaledChapterFontSize }]}>
            현재 {item.currentChapter}챕터
          </Text>

          {item.hasProgress && (
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>이어듣기</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const displayName = student?.name || '학생';

  // 고대비 모드 적용
  const HC = settings.highContrastMode;
  const headerFontSize = 36 * settings.fontSizeScale;

  return (
    <SafeAreaView 
      style={[styles.container, HC && styles.containerHC]} 
      edges={['top', 'bottom']}
    >
      <View style={[styles.header, HC && styles.headerHC]}>
        <Text 
          style={[
            styles.studentName, 
            { fontSize: headerFontSize },
            HC && styles.textHC
          ]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`${displayName} 학생의 서재`}
        >
          {displayName}
        </Text>

        {/* 설정 버튼 */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
          accessible={true}
          accessibilityLabel="사용자 설정"
          accessibilityRole="button"
          accessibilityHint="TTS 속도 및 화면 설정을 변경합니다."
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={dummyMaterials}
        renderItem={renderMaterialButton}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        accessible={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // 고대비 모드 스타일
  containerHC: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  headerHC: {
    borderBottomColor: '#ffffff',
  },
  studentName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333333',
  },
  textHC: {
    color: '#ffffff',
  },
  settingsButton: { 
    padding: 10,
    minWidth: 44, 
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 28,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  materialButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minHeight: 88,
  },
  materialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  chapterText: {
    fontSize: 18,
    color: '#666666',
    marginLeft: 12,
  },
  progressIndicator: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});