"""
PDF 텍스트 레이어 분석 서비스 (PyMuPDF 사용)

PDF에서 텍스트, 폰트 정보, 바운딩 박스를 추출하여
목차/헤딩 감지를 위한 데이터를 제공합니다.
"""

import fitz  # PyMuPDF
import logging
from typing import List, Optional, Dict
from pathlib import Path

from app.models.pdf_models import (
    TextBlock,
    FontInfo,
    BoundingBox,
    PageAnalysis,
    DocumentAnalysis
)

logger = logging.getLogger(__name__)


class PDFAnalyzer:
    """PDF 텍스트 레이어 분석 클래스"""

    def __init__(self):
        """초기화"""
        self.doc: Optional[fitz.Document] = None
        self.file_path: Optional[str] = None

    def open(self, pdf_path: str) -> bool:
        """
        PDF 파일 열기

        Args:
            pdf_path: PDF 파일 경로

        Returns:
            성공 여부
        """
        try:
            self.file_path = pdf_path
            self.doc = fitz.open(pdf_path)
            logger.info(f"PDF 파일 열기 성공: {pdf_path} ({self.doc.page_count} 페이지)")
            return True
        except Exception as e:
            logger.error(f"PDF 파일 열기 실패: {pdf_path}, 오류: {str(e)}")
            return False

    def close(self):
        """PDF 파일 닫기"""
        if self.doc:
            self.doc.close()
            self.doc = None
            logger.info("PDF 파일 닫기 완료")

    def check_text_layer(self, page_num: int = 0) -> bool:
        """
        텍스트 레이어 존재 여부 확인
        첫 페이지(또는 지정된 페이지)에 텍스트가 있는지 확인

        Args:
            page_num: 확인할 페이지 번호 (0부터 시작)

        Returns:
            텍스트 레이어 존재 여부
        """
        if not self.doc:
            logger.warning("PDF가 열리지 않음")
            return False

        try:
            page = self.doc[page_num]
            text = page.get_text()
            has_text = len(text.strip()) > 0

            logger.info(f"페이지 {page_num} 텍스트 레이어: {'있음' if has_text else '없음'}")
            return has_text

        except Exception as e:
            logger.error(f"텍스트 레이어 확인 실패: {str(e)}")
            return False

    def extract_text_with_fonts(self, page_num: int) -> List[TextBlock]:
        """
        페이지에서 텍스트 + 폰트 정보 + 바운딩 박스 추출

        Args:
            page_num: 페이지 번호 (0부터 시작)

        Returns:
            텍스트 블록 리스트
        """
        if not self.doc:
            logger.warning("PDF가 열리지 않음")
            return []

        try:
            page = self.doc[page_num]
            blocks = []

            # get_text("dict") - 상세한 텍스트 정보 추출
            # 블록 → 라인 → 스팬(span) 구조로 되어 있음
            text_dict = page.get_text("dict")

            for block in text_dict.get("blocks", []):
                # 이미지 블록 스킵
                if block.get("type") != 0:  # 0 = text block
                    continue

                # 라인 순회
                for line in block.get("lines", []):
                    # 스팬(span) 순회 - 각 스팬은 동일한 폰트 속성을 가진 텍스트
                    for span in line.get("spans", []):
                        text_content = span.get("text", "").strip()
                        if not text_content:
                            continue

                        # 바운딩 박스 추출
                        bbox_coords = span.get("bbox")  # (x0, y0, x1, y1)
                        if not bbox_coords or len(bbox_coords) != 4:
                            continue

                        bbox = BoundingBox(
                            x0=bbox_coords[0],
                            y0=bbox_coords[1],
                            x1=bbox_coords[2],
                            y1=bbox_coords[3]
                        )

                        # 폰트 정보 추출
                        font_name = span.get("font", "Unknown")
                        font_size = span.get("size", 0.0)
                        font_flags = span.get("flags", 0)

                        # flags를 통해 볼드/이탤릭 판단
                        # flags & 16 = 볼드
                        # flags & 2 = 이탤릭
                        is_bold = bool(font_flags & 16) or "Bold" in font_name
                        is_italic = bool(font_flags & 2) or "Italic" in font_name

                        font_info = FontInfo(
                            name=font_name,
                            size=font_size,
                            is_bold=is_bold,
                            is_italic=is_italic,
                            color=span.get("color")
                        )

                        # TextBlock 생성
                        text_block = TextBlock(
                            text=text_content,
                            bbox=bbox,
                            font=font_info,
                            page_num=page_num,
                            block_type="text"
                        )

                        blocks.append(text_block)

            logger.info(f"페이지 {page_num}: {len(blocks)}개 텍스트 블록 추출")
            return blocks

        except Exception as e:
            logger.error(f"텍스트 추출 실패 (페이지 {page_num}): {str(e)}")
            return []

    def analyze_page(self, page_num: int) -> PageAnalysis:
        """
        페이지 전체 분석

        Args:
            page_num: 페이지 번호 (0부터 시작)

        Returns:
            페이지 분석 결과
        """
        if not self.doc:
            raise ValueError("PDF가 열리지 않음")

        page = self.doc[page_num]
        rect = page.rect

        # 텍스트 블록 추출
        text_blocks = self.extract_text_with_fonts(page_num)

        # 페이지 분석 결과 생성
        analysis = PageAnalysis(
            page_num=page_num,
            width=rect.width,
            height=rect.height,
            has_text_layer=len(text_blocks) > 0,
            text_blocks=text_blocks
        )

        # 평균 폰트 크기 계산
        analysis.calculate_avg_font_size()

        # 주요 폰트 찾기
        if text_blocks:
            font_counts = {}
            for block in text_blocks:
                font_name = block.font.name
                font_counts[font_name] = font_counts.get(font_name, 0) + 1

            dominant_font = max(font_counts, key=font_counts.get)
            analysis.dominant_font = dominant_font

        return analysis

    def analyze_document(self) -> DocumentAnalysis:
        """
        전체 문서 분석

        Returns:
            문서 분석 결과
        """
        if not self.doc:
            raise ValueError("PDF가 열리지 않음")

        file_name = Path(self.file_path).name if self.file_path else "unknown.pdf"
        total_pages = self.doc.page_count

        # 전체 문서 분석 객체 생성
        doc_analysis = DocumentAnalysis(
            file_name=file_name,
            total_pages=total_pages,
            has_text_layer=False  # 초기값
        )

        # 각 페이지 분석
        for page_num in range(total_pages):
            try:
                page_analysis = self.analyze_page(page_num)
                doc_analysis.pages.append(page_analysis)

                # 텍스트 레이어가 하나라도 있으면 True
                if page_analysis.has_text_layer:
                    doc_analysis.has_text_layer = True

                logger.info(
                    f"페이지 {page_num + 1}/{total_pages} 분석 완료 "
                    f"(블록: {len(page_analysis.text_blocks)}, "
                    f"평균 폰트: {page_analysis.avg_font_size:.1f}pt)"
                )

            except Exception as e:
                logger.error(f"페이지 {page_num} 분석 실패: {str(e)}")
                continue

        # 전체 문서 평균 폰트 크기 계산
        doc_analysis.calculate_global_avg_font_size()

        logger.info(
            f"문서 분석 완료: {file_name} "
            f"({total_pages} 페이지, 평균 폰트: {doc_analysis.global_avg_font_size:.1f}pt)"
        )

        return doc_analysis


def analyze_pdf(pdf_path: str) -> DocumentAnalysis:
    """
    PDF 파일 분석 (편의 함수)

    Args:
        pdf_path: PDF 파일 경로

    Returns:
        문서 분석 결과
    """
    analyzer = PDFAnalyzer()

    try:
        if not analyzer.open(pdf_path):
            raise ValueError(f"PDF 파일을 열 수 없음: {pdf_path}")

        doc_analysis = analyzer.analyze_document()
        return doc_analysis

    finally:
        analyzer.close()


# 테스트용 메인
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("사용법: python pdf_analyzer.py <pdf_file_path>")
        sys.exit(1)

    pdf_file = sys.argv[1]

    # 로깅 설정
    logging.basicConfig(level=logging.INFO)

    # PDF 분석
    result = analyze_pdf(pdf_file)

    # 결과 출력
    print(f"\n{'='*60}")
    print(f"파일명: {result.file_name}")
    print(f"총 페이지: {result.total_pages}")
    print(f"텍스트 레이어: {'있음' if result.has_text_layer else '없음'}")
    print(f"평균 폰트 크기: {result.global_avg_font_size:.2f}pt")
    print(f"{'='*60}\n")

    # 헤딩 후보 출력
    candidates = result.get_all_heading_candidates(threshold=1.3)
    print(f"\n헤딩 후보 ({len(candidates)}개):")
    for i, candidate in enumerate(candidates[:10], 1):  # 최대 10개만
        print(
            f"{i}. [페이지 {candidate.page_num + 1}] "
            f"{candidate.text} "
            f"({candidate.font.size:.1f}pt, {candidate.font.name})"
        )