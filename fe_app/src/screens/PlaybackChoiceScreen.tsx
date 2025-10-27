import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  PlaybackChoiceScreenNavigationProp,
  PlaybackChoiceScreenRouteProp 
} from '../navigation/navigationTypes';
import { getChaptersByBookId } from '../data/dummyChapters';

export default function PlaybackChoiceScreen() {
  const navigation = useNavigation<PlaybackChoiceScreenNavigationProp>();
  const route = useRoute<PlaybackChoiceScreenRouteProp>();
  const { book } = route.params;

  // 첫 번째 챕터 가져오기
  const chapters = getChaptersByBookId(book.id);
  const firstChapter = chapters[0];

  useEffect(() => {
    const announcement = `${book.subject}, ${book.currentChapter}챕터. 이어듣기 또는 처음부터 선택하세요.`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, []);

  const handleFromStart = () => {
    AccessibilityInfo.announceForAccessibility('처음부터 시작합니다.');
    
    if (firstChapter) {
      navigation.navigate('Player', {
        book,
        chapterId: firstChapter.id,
        fromStart: true,
      });
    }
  };

  const handleContinue = () => {
    AccessibilityInfo.announceForAccessibility('이어서 듣기 시작합니다.');
    
    // 현재 챕터 찾기 (여기서는 간단하게 첫 번째 챕터로)
    if (firstChapter) {
      navigation.navigate('Player', {
        book,
        chapterId: firstChapter.id,
        fromStart: false,
      });
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* 뒤로가기 버튼 */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleGoBack}
        accessible={true}
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
      >
        <Text style={styles.backButtonText}>← 뒤로</Text>
      </TouchableOpacity>

      {/* 교재 정보 */}
      <View style={styles.infoSection}>
        <Text 
          style={styles.subjectText}
          accessible={true}
          accessibilityRole="header"
        >
          {book.subject}
        </Text>
        <Text style={styles.chapterText}>
          {book.currentChapter}챕터
        </Text>
      </View>

      {/* 선택 버튼들 */}
      <View style={styles.buttonSection}>
        {book.hasProgress && (
          <TouchableOpacity
            style={[styles.choiceButton, styles.continueButton]}
            onPress={handleContinue}
            accessible={true}
            accessibilityLabel="이어서 듣기"
            accessibilityRole="button"
            accessibilityHint="마지막 들었던 위치부터 계속 듣습니다"
          >
            <Text style={styles.buttonText}>이어서 듣기</Text>
            <Text style={styles.buttonSubtext}>마지막 위치부터</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.choiceButton, styles.fromStartButton]}
          onPress={handleFromStart}
          accessible={true}
          accessibilityLabel="처음부터 듣기"
          accessibilityRole="button"
          accessibilityHint="챕터 처음부터 다시 듣습니다"
        >
          <Text style={styles.buttonText}>처음부터 듣기</Text>
          <Text style={styles.buttonSubtext}>챕터 처음부터</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 60,
    alignItems: 'center',
  },
  subjectText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  chapterText: {
    fontSize: 24,
    color: '#666666',
  },
  buttonSection: {
    gap: 20,
  },
  choiceButton: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    borderWidth: 3,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
  },
  fromStartButton: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  buttonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  buttonSubtext: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
  },
});