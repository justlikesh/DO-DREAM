import React from 'react';
import {
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LibraryScreenNavigationProp } from '../../navigation/navigationTypes';
import { dummyMaterials, studentName } from '../../data/dummyMaterials';
import { Material } from '../../types/material';

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();

  const handleMaterialPress = (material: Material) => {
    console.log('선택한 교재:', material.title);
    navigation.navigate('PlaybackChoice', { material });
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text 
          style={styles.studentName}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`${studentName} 학생의 서재`}
        >
          {studentName}
        </Text>
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