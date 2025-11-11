"""
헤딩 감지 서비스 (폰트 기반)

PDF 텍스트 블록에서 폰트 크기, 위치, 스타일을 분석하여
헤딩(제목)을 자동으로 감지하고 목차 구조를 생성합니다.
"""

import re
import logging
from typing import List, Optional, Tuple
from dataclasses import dataclass

from app.models.pdf_models import TextBlock, DocumentAnalysis
from app.utils.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TOCEntry:
    """목차 항목"""
    title: str
    level: int  # 1=대단원, 2=중단원, 3=소단원
    page_num: int
    font_size: float
    bbox_x0: float
    bbox_y0: float
    confidence: float = 1.0

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "title": self.title,
            "level": self.level,
            "pageNum": self.page_num,
            "fontSize": self.font_size,
            "bbox": {
                "x": self.bbox_x0,
                "y": self.bbox_y0
            },
            "confidence": round(self.confidence, 3)
        }


class HeadingDetector:
    """헤딩 감지 클래스"""

    def __init__(self):
        """초기화"""
        self.threshold_l1 = settings.HEADING_FONT_RATIO_L1  # Level 1 임계값 (1.8)
        self.threshold_l2 = settings.HEADING_FONT_RATIO_L2  # Level 2 임계값 (1.4)
        self.threshold_l3 = settings.HEADING_FONT_RATIO_L3  # Level 3 임계값 (1.2)

    def is_in_heading_position(
        self,
        block: TextBlock,
        page_width: float,
        page_height: float
    ) -> bool:
        """
        헤딩이 주로 위치하는 영역인지 확인
        - 페이지 좌측 상단 (x < pageWidth * 0.3)
        - 상단 영역 (y < 150pt)

        Args:
            block: 텍스트 블록
            page_width: 페이지 너비
            page_height: 페이지 높이

        Returns:
            위치 조건 만족 여부
        """
        # X 좌표 조건: 좌측 30% 영역
        is_left_side = block.bbox.x0 < page_width * 0.3

        # Y 좌표 조건: 상단 150pt 이내 또는 페이지 상단 20% 이내
        is_top_area = (block.bbox.y0 < 150) or (block.bbox.y0 < page_height * 0.2)

        # 둘 중 하나만 만족해도 OK (일부 PDF는 중앙 정렬 제목도 있음)
        return is_left_side or is_top_area

    def is_heading_pattern(self, text: str) -> bool:
        """
        제목 패턴 매칭 (정규식)

        패턴:
        - "1. 서론"
        - "제1장", "제 1 장"
        - "Chapter 1"
        - "I. Introduction"
        - "1-1 개념"
        - "[단원명]"
        - "1) 제목"

        Args:
            text: 텍스트 내용

        Returns:
            패턴 매칭 여부
        """
        patterns = [
            r'^\d+\.\s*.+',  # "1. 서론"
            r'^제\s*\d+\s*장.+',  # "제1장"
            r'^Chapter\s+\d+',  # "Chapter 1"
            r'^[IVX]+\.\s*.+',  # "I. Introduction"
            r'^\d+-\d+',  # "1-1 개념"
            r'^\[.*\]',  # "[단원명]"
            r'^\d+\)\s*.+',  # "1) 제목"
            r'^제\s*\d+\s*절',  # "제1절"
            r'^Section\s+\d+',  # "Section 1"
            r'^\d+\.\d+',  # "1.1"
        ]

        text_stripped = text.strip()

        for pattern in patterns:
            if re.match(pattern, text_stripped, re.IGNORECASE):
                return True

        return False

    def determine_heading_level(
        self,
        block: TextBlock,
        avg_font_size: float
    ) -> Optional[int]:
        """
        헤딩 레벨 결정

        Args:
            block: 텍스트 블록
            avg_font_size: 평균 폰트 크기

        Returns:
            헤딩 레벨 (1/2/3) 또는 None (헤딩 아님)
        """
        if avg_font_size == 0:
            return None

        ratio = block.font.size / avg_font_size

        # Level 1 (대단원): fontSize >= avgFontSize * 1.8
        if ratio >= self.threshold_l1:
            return 1

        # Level 2 (중단원): fontSize >= avgFontSize * 1.4
        if ratio >= self.threshold_l2:
            return 2

        # Level 3 (소단원): fontSize >= avgFontSize * 1.2
        if ratio >= self.threshold_l3:
            return 3

        # 임계값 미만
        return None

    def is_heading_candidate(
        self,
        block: TextBlock,
        avg_font_size: float,
        page_width: float,
        page_height: float
    ) -> Tuple[bool, Optional[int]]:
        """
        헤딩 후보 여부 판단 (복합 조건)

        조건:
        1. 폰트 크기가 평균보다 큼
        2. 볼드체 또는 특정 폰트 사용
        3. 위치 조건 (좌측 상단)
        4. 패턴 매칭 (선택적 강화)

        Args:
            block: 텍스트 블록
            avg_font_size: 평균 폰트 크기
            page_width: 페이지 너비
            page_height: 페이지 높이

        Returns:
            (헤딩 여부, 헤딩 레벨)
        """
        # 1. 레벨 결정 (폰트 크기 기반)
        level = self.determine_heading_level(block, avg_font_size)

        if level is None:
            return False, None

        # 2. 추가 조건 체크

        # 텍스트가 너무 짧으면 제외 (1글자 이하)
        if len(block.text.strip()) <= 1:
            return False, None

        # 텍스트가 너무 길면 제외 (200자 이상은 본문일 가능성 높음)
        if len(block.text.strip()) > 200:
            return False, None

        # 3. 가중치 계산 (신뢰도)
        confidence = 0.5  # 기본 신뢰도

        # 볼드체면 +0.2
        if block.font.is_bold:
            confidence += 0.2

        # 위치 조건 만족하면 +0.2
        if self.is_in_heading_position(block, page_width, page_height):
            confidence += 0.2

        # 패턴 매칭 만족하면 +0.3
        if self.is_heading_pattern(block.text):
            confidence += 0.3

        # 최소 신뢰도 0.6 이상이어야 헤딩으로 인정
        if confidence >= 0.6:
            return True, level
        else:
            return False, None

    def detect_headings_from_document(
        self,
        doc_analysis: DocumentAnalysis,
        use_reference_position: bool = True,
        reference_y_min: float = 65.0,
        reference_y_max: float = 75.0
    ) -> List[TOCEntry]:
        """
        전체 문서에서 헤딩 감지 및 목차 생성 (거짓 양성 제거 포함)

        Args:
            doc_analysis: 문서 분석 결과 (PyMuPDF)
            use_reference_position: 참조 위치 기반 필터링 사용 여부
            reference_y_min: 참조 y 좌표 최소값
            reference_y_max: 참조 y 좌표 최대값

        Returns:
            목차 항목 리스트
        """
        if use_reference_position:
            return self.detect_headings_by_reference_position(
                doc_analysis,
                reference_y_min,
                reference_y_max
            )
        else:
            toc_entries = self.detect_headings(doc_analysis)
            return self.filter_false_positives(toc_entries)

    def detect_headings(
        self,
        doc_analysis: DocumentAnalysis
    ) -> List[TOCEntry]:
        """
        전체 문서에서 헤딩 감지 및 목차 생성

        Args:
            doc_analysis: 문서 분석 결과 (PyMuPDF)

        Returns:
            목차 항목 리스트
        """
        toc_entries = []

        avg_font_size = doc_analysis.global_avg_font_size

        if avg_font_size == 0:
            logger.warning("평균 폰트 크기가 0이므로 헤딩 감지 불가")
            return []

        logger.info(f"전체 문서 평균 폰트 크기: {avg_font_size:.2f}pt")

        # 각 페이지 순회
        for page_analysis in doc_analysis.pages:
            page_num = page_analysis.page_num
            page_width = page_analysis.width
            page_height = page_analysis.height

            # 각 텍스트 블록 순회
            for block in page_analysis.text_blocks:
                is_heading, level = self.is_heading_candidate(
                    block,
                    avg_font_size,
                    page_width,
                    page_height
                )

                if is_heading and level:
                    # 신뢰도 계산 (간단 버전)
                    confidence = min(1.0, block.font.size / avg_font_size / 2.0)

                    toc_entry = TOCEntry(
                        title=block.text.strip(),
                        level=level,
                        page_num=page_num,
                        font_size=block.font.size,
                        bbox_x0=block.bbox.x0,
                        bbox_y0=block.bbox.y0,
                        confidence=confidence
                    )

                    toc_entries.append(toc_entry)

                    logger.info(
                        f"헤딩 감지: [{level}] '{block.text[:30]}...' "
                        f"(페이지 {page_num}, {block.font.size:.1f}pt, "
                        f"신뢰도 {confidence:.2f})"
                    )

        logger.info(f"총 {len(toc_entries)}개 헤딩 감지 완료")
        return toc_entries

    def build_toc_structure(
        self,
        toc_entries: List[TOCEntry]
    ) -> List[dict]:
        """
        목차 구조 생성 (계층적 트리)

        Args:
            toc_entries: 목차 항목 리스트

        Returns:
            계층적 목차 구조 (dict 리스트)
        """
        # 간단 버전: 플랫 리스트로 반환 (레벨 정보 포함)
        # 향후 트리 구조로 확장 가능

        result = []

        for entry in toc_entries:
            result.append({
                "title": entry.title,
                "level": entry.level,
                "pageNum": entry.page_num + 1,  # 사용자는 1부터 시작
                "fontSize": entry.font_size,
                "confidence": entry.confidence
            })

        return result

    def detect_headings_by_reference_position(
        self,
        doc_analysis: DocumentAnalysis,
        reference_y_min: float = 65.0,
        reference_y_max: float = 75.0,
        font_size_tolerance: float = 0.5
    ) -> List[TOCEntry]:
        """
        참조 위치 기반 헤딩 감지

        특정 y 좌표 범위에 있는 텍스트들의 폰트 정보를 분석하여,
        동일한 폰트명과 크기를 가진 모든 텍스트를 목차로 사용

        Args:
            doc_analysis: 문서 분석 결과
            reference_y_min: 참조 y 좌표 최소값
            reference_y_max: 참조 y 좌표 최대값
            font_size_tolerance: 폰트 크기 허용 오차

        Returns:
            목차 항목 리스트
        """
        logger.info(f"참조 위치 기반 헤딩 감지 시작 (y: {reference_y_min}~{reference_y_max})")

        # Step 1: 참조 위치의 텍스트 블록 찾기
        reference_blocks = []
        for page_analysis in doc_analysis.pages:
            for block in page_analysis.text_blocks:
                y = block.bbox.y0
                if reference_y_min <= y <= reference_y_max:
                    reference_blocks.append(block)
                    logger.info(
                        f"✅ 참조 블록 발견: '{block.text[:50]}' "
                        f"(y={y:.4f}, font={block.font.name}, size={block.font.size:.2f}pt)"
                    )

        if not reference_blocks:
            logger.warning(f"참조 위치({reference_y_min}~{reference_y_max})에 텍스트가 없습니다. 기본 방식 사용")
            return self.filter_false_positives(self.detect_headings(doc_analysis))

        logger.info(f"참조 위치에서 {len(reference_blocks)}개 블록 발견")

        # Step 2: 참조 블록들의 폰트 정보 분석
        font_info_counts = {}
        for block in reference_blocks:
            # 폰트명 + 크기를 키로 사용 (크기는 반올림)
            font_key = (block.font.name, round(block.font.size, 1))
            font_info_counts[font_key] = font_info_counts.get(font_key, 0) + 1

        # 가장 많이 사용된 폰트 정보 찾기
        if not font_info_counts:
            logger.warning("참조 블록에서 폰트 정보를 찾을 수 없습니다")
            return []

        reference_font_name, reference_font_size = max(
            font_info_counts.items(),
            key=lambda x: x[1]
        )[0]

        logger.info(
            f"참조 폰트 결정: {reference_font_name}, {reference_font_size}pt "
            f"(출현 {font_info_counts[(reference_font_name, reference_font_size)]}회)"
        )

        # Step 3: 전체 문서에서 동일한 폰트명과 크기를 가진 텍스트 찾기
        toc_entries = []
        for page_analysis in doc_analysis.pages:
            page_num = page_analysis.page_num

            for block in page_analysis.text_blocks:
                # 폰트명 일치 확인
                if block.font.name != reference_font_name:
                    continue

                # 폰트 크기 일치 확인 (허용 오차 내)
                size_diff = abs(block.font.size - reference_font_size)
                if size_diff > font_size_tolerance:
                    continue

                # 텍스트 필터링
                text = block.text.strip()

                # 너무 짧으면 제외
                if len(text) < 2:
                    continue

                # 숫자만 있으면 제외
                if text.isdigit():
                    continue

                # 목차 항목 생성 (레벨은 모두 1로 통일)
                toc_entry = TOCEntry(
                    title=text,
                    level=1,  # 동일 폰트는 모두 같은 레벨
                    page_num=page_num,
                    font_size=block.font.size,
                    bbox_x0=block.bbox.x0,
                    bbox_y0=block.bbox.y0,
                    confidence=0.95  # 참조 기반이므로 높은 신뢰도
                )

                toc_entries.append(toc_entry)

                logger.info(
                    f"📝 목차 항목 추가: '{text}' "
                    f"(페이지 {page_num}, y={block.bbox.y0:.4f}, font={block.font.name}, size={block.font.size:.2f}pt)"
                )

        logger.info(f"총 {len(toc_entries)}개 목차 항목 발견 (참조 폰트 기반)")

        # Step 4: 중복 제거 (동일 텍스트가 여러 번 나오는 경우)
        filtered = self.filter_duplicates(toc_entries)

        return filtered

    def filter_duplicates(self, toc_entries: List[TOCEntry]) -> List[TOCEntry]:
        """
        중복된 제목 제거 (같은 제목이 여러 페이지에 나오는 경우 첫 번째만 유지)

        Args:
            toc_entries: 목차 항목 리스트

        Returns:
            중복 제거된 목차 항목 리스트
        """
        seen_titles = set()
        filtered = []

        for entry in toc_entries:
            if entry.title not in seen_titles:
                seen_titles.add(entry.title)
                filtered.append(entry)
            else:
                logger.debug(f"중복 제거: '{entry.title}'")

        logger.info(f"중복 제거: {len(toc_entries)} → {len(filtered)}")
        return filtered

    def filter_false_positives(
        self,
        toc_entries: List[TOCEntry]
    ) -> List[TOCEntry]:
        """
        거짓 양성(false positive) 제거

        - 동일한 텍스트가 너무 많이 반복되면 헤더/푸터일 가능성
        - 너무 짧은 텍스트 (예: "1", "A")
        - 숫자만 있는 경우

        Args:
            toc_entries: 목차 항목 리스트

        Returns:
            필터링된 목차 항목 리스트
        """
        filtered = []

        # 텍스트 빈도 계산
        text_counts = {}
        for entry in toc_entries:
            text_counts[entry.title] = text_counts.get(entry.title, 0) + 1

        for entry in toc_entries:
            # 동일 텍스트가 5회 이상 반복되면 제외 (헤더/푸터)
            if text_counts[entry.title] >= 5:
                logger.debug(f"거짓 양성 제거 (반복): {entry.title}")
                continue

            # 텍스트가 너무 짧으면 제외 (2글자 미만)
            if len(entry.title.strip()) < 2:
                logger.debug(f"거짓 양성 제거 (짧음): {entry.title}")
                continue

            # 숫자만 있으면 제외
            if entry.title.strip().isdigit():
                logger.debug(f"거짓 양성 제거 (숫자만): {entry.title}")
                continue

            filtered.append(entry)

        logger.info(f"거짓 양성 제거: {len(toc_entries)} → {len(filtered)}")
        return filtered


# 편의 함수
def detect_headings_from_pdf(pdf_path: str) -> List[TOCEntry]:
    """
    PDF에서 헤딩 감지 (편의 함수)

    Args:
        pdf_path: PDF 파일 경로

    Returns:
        목차 항목 리스트
    """
    from app.services.pdf_analyzer import analyze_pdf

    # PDF 분석
    doc_analysis = analyze_pdf(pdf_path)

    # 헤딩 감지
    detector = HeadingDetector()
    toc_entries = detector.detect_headings(doc_analysis)

    # 거짓 양성 제거
    toc_entries = detector.filter_false_positives(toc_entries)

    return toc_entries


# 테스트용 메인
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("사용법: python heading_detector.py <pdf_file_path>")
        sys.exit(1)

    pdf_file = sys.argv[1]

    # 로깅 설정
    logging.basicConfig(level=logging.INFO)

    # 헤딩 감지
    toc_entries = detect_headings_from_pdf(pdf_file)

    # 결과 출력
    print(f"\n{'='*60}")
    print(f"헤딩 감지 결과: 총 {len(toc_entries)}개")
    print(f"{'='*60}\n")

    for i, entry in enumerate(toc_entries, 1):
        indent = "  " * (entry.level - 1)
        print(
            f"{indent}{i}. [Level {entry.level}] {entry.title} "
            f"(페이지 {entry.page_num + 1}, {entry.font_size:.1f}pt, "
            f"신뢰도 {entry.confidence:.2f})"
        )