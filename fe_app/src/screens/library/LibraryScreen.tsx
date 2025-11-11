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

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const student = useAuthStore((state) => state.student);
  const hydrate = useAuthStore((state) => state.hydrate);

  // 컴포넌트 마운트 시 저장된 인증 정보 불러오기
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleMaterialPress = (material: Material) => {
    console.log('선택한 교재:', material.title);
    navigation.navigate('PlaybackChoice', { material });
  };
  
  // 설정 버튼 핸들러
  const handleSettingsPress = () => {
    AccessibilityInfo.announceForAccessibility("설정 화면으로 이동합니다.");
    navigation.navigate('Settings');
  };

  const renderMaterialButton = ({ item }: { item: Material }) => {
    const accessibilityLabel = `${item.title}, 현재 ${item.currentChapter}챕터, 전체 ${item.totalChapters}챕터 중. ${
      item.hasProgress ? '이어듣기 가능' : '처음부터 시작'
    }`;

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
          <Text style={styles.subjectText}>{item.title}</Text>
          
          <Text style={styles.chapterText}>
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

  // 학생 이름 표시 (로그인 정보가 있으면 실제 이름, 없으면 기본값)
  const displayName = student?.name || '학생';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text 
          style={styles.studentName}
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
  studentName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333333',
    // 버튼 공간을 위해 flex 사용 가능 (옵션)
    // flex: 1, 
  },
  settingsButton: { 
    padding: 10,
    minWidth: 44, 
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fde676',
    borderRadius: 12,
    borderStyle: 'solid',
    borderWidth: 2,
    borderColor: '#f8d93cff',
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