"""
레이아웃 감지 서비스 (LayoutParser 사용)

LayoutParser를 사용하여 PDF 페이지의 레이아웃 구조를 감지합니다.
- 문단 (paragraph)
- 헤딩 (heading)
- 표 (table)
- 그림 (figure)
- 캡션 (caption)
"""

import fitz  # PyMuPDF
import layoutparser as lp
import numpy as np
from PIL import Image
import logging
from typing import List, Optional, Tuple
from pathlib import Path

from app.models.pdf_models import LayoutBlock, BoundingBox
from app.utils.config import settings

logger = logging.getLogger(__name__)


class LayoutDetector:
    """레이아웃 감지 클래스"""

    def __init__(self):
        """초기화 - LayoutParser 모델 로드"""
        self.model: Optional[lp.Detectron2LayoutModel] = None
        self.doc: Optional[fitz.Document] = None
        self.file_path: Optional[str] = None

    def load_model(self):
        """
        LayoutParser 모델 로드
        PubLayNet 데이터셋으로 학습된 Faster R-CNN 모델 사용
        """
        try:
            if self.model is not None:
                logger.info("모델이 이미 로드되어 있습니다")
                return True

            logger.info(f"LayoutParser 모델 로드 중: {settings.LAYOUT_MODEL_TYPE}")

            # PubLayNet 모델 로드
            # 지원 레이블: Text, Title, List, Table, Figure
            self.model = lp.Detectron2LayoutModel(
                config_path=settings.LAYOUT_MODEL_TYPE,
                extra_config=["MODEL.ROI_HEADS.SCORE_THRESH_TEST",
                              settings.LAYOUT_CONFIDENCE_THRESHOLD],
                label_map={0: "Text", 1: "Title", 2: "List", 3: "Table", 4: "Figure"}
            )

            logger.info("LayoutParser 모델 로드 완료")
            return True

        except Exception as e:
            logger.error(f"모델 로드 실패: {str(e)}")
            return False

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

    def render_page_to_image(self, page_num: int, dpi: int = None) -> Optional[np.ndarray]:
        """
        PDF 페이지를 이미지로 렌더링

        Args:
            page_num: 페이지 번호 (0부터 시작)
            dpi: 렌더링 DPI (기본값: settings.PDF_DPI)

        Returns:
            numpy 배열 형태의 이미지 (RGB)
        """
        if not self.doc:
            logger.warning("PDF가 열리지 않음")
            return None

        try:
            if dpi is None:
                dpi = settings.PDF_DPI

            page = self.doc[page_num]

            # 확대 비율 계산 (72 DPI 기준)
            zoom = dpi / 72
            mat = fitz.Matrix(zoom, zoom)

            # 페이지를 이미지로 렌더링
            pix = page.get_pixmap(matrix=mat)

            # PIL Image로 변환
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            # numpy 배열로 변환
            img_array = np.array(img)

            logger.info(f"페이지 {page_num} 이미지 렌더링 완료: {img_array.shape}")
            return img_array

        except Exception as e:
            logger.error(f"이미지 렌더링 실패 (페이지 {page_num}): {str(e)}")
            return None

    def detect_layout(self, page_num: int) -> List[LayoutBlock]:
        """
        페이지 레이아웃 감지

        Args:
            page_num: 페이지 번호 (0부터 시작)

        Returns:
            레이아웃 블록 리스트
        """
        if not self.doc:
            logger.warning("PDF가 열리지 않음")
            return []

        if not self.model:
            logger.warning("모델이 로드되지 않음")
            return []

        try:
            # 페이지를 이미지로 렌더링
            img_array = self.render_page_to_image(page_num)
            if img_array is None:
                return []

            # 레이아웃 감지 수행
            layout = self.model.detect(img_array)

            # 페이지 크기 가져오기
            page = self.doc[page_num]
            page_width = page.rect.width
            page_height = page.rect.height

            # 이미지 크기
            img_height, img_width = img_array.shape[:2]

            # 좌표 변환 비율 (이미지 좌표 → PDF 좌표)
            scale_x = page_width / img_width
            scale_y = page_height / img_height

            # LayoutBlock 객체로 변환
            blocks = []
            for idx, block in enumerate(layout):
                # 바운딩 박스 좌표 (이미지 좌표계)
                x1, y1, x2, y2 = block.coordinates

                # PDF 좌표계로 변환
                bbox = BoundingBox(
                    x0=float(x1 * scale_x),
                    y0=float(y1 * scale_y),
                    x1=float(x2 * scale_x),
                    y1=float(y2 * scale_y)
                )

                # 블록 타입 매핑
                # PubLayNet: Text, Title, List, Table, Figure
                # 우리 모델: paragraph, heading, table, figure, caption
                block_type_map = {
                    "Text": "paragraph",
                    "Title": "heading",
                    "List": "paragraph",  # 리스트도 문단으로 처리
                    "Table": "table",
                    "Figure": "figure"
                }

                original_type = block.type
                mapped_type = block_type_map.get(original_type, "paragraph")

                layout_block = LayoutBlock(
                    block_type=mapped_type,
                    bbox=bbox,
                    page_num=page_num,
                    confidence=float(block.score),
                    text=None,  # OCR은 나중에 수행
                    order=idx
                )

                blocks.append(layout_block)

            # 읽기 순서대로 정렬 (위→아래, 좌→우)
            blocks.sort(key=lambda b: (b.bbox.y0, b.bbox.x0))

            # order 재할당
            for idx, block in enumerate(blocks):
                block.order = idx

            logger.info(f"페이지 {page_num}: {len(blocks)}개 레이아웃 블록 감지")
            return blocks

        except Exception as e:
            logger.error(f"레이아웃 감지 실패 (페이지 {page_num}): {str(e)}")
            return []

    def crop_block_image(
        self,
        page_num: int,
        bbox: BoundingBox,
        padding: int = 5
    ) -> Optional[np.ndarray]:
        """
        레이아웃 블록 영역을 이미지로 크롭

        Args:
            page_num: 페이지 번호
            bbox: 바운딩 박스 (PDF 좌표)
            padding: 패딩 픽셀

        Returns:
            크롭된 이미지 (numpy 배열)
        """
        try:
            # 전체 페이지 이미지 렌더링
            img_array = self.render_page_to_image(page_num)
            if img_array is None:
                return None

            # 페이지 크기
            page = self.doc[page_num]
            page_width = page.rect.width
            page_height = page.rect.height

            # 이미지 크기
            img_height, img_width = img_array.shape[:2]

            # PDF 좌표 → 이미지 좌표 변환
            scale_x = img_width / page_width
            scale_y = img_height / page_height

            x0 = int(bbox.x0 * scale_x)
            y0 = int(bbox.y0 * scale_y)
            x1 = int(bbox.x1 * scale_x)
            y1 = int(bbox.y1 * scale_y)

            # 패딩 추가 및 경계 체크
            x0 = max(0, x0 - padding)
            y0 = max(0, y0 - padding)
            x1 = min(img_width, x1 + padding)
            y1 = min(img_height, y1 + padding)

            # 크롭
            cropped = img_array[y0:y1, x0:x1]

            logger.info(f"블록 이미지 크롭 완료: {cropped.shape}")
            return cropped

        except Exception as e:
            logger.error(f"블록 이미지 크롭 실패: {str(e)}")
            return None


# 편의 함수
def detect_pdf_layout(pdf_path: str, page_num: int) -> List[LayoutBlock]:
    """
    PDF 페이지의 레이아웃 감지 (편의 함수)

    Args:
        pdf_path: PDF 파일 경로
        page_num: 페이지 번호

    Returns:
        레이아웃 블록 리스트
    """
    detector = LayoutDetector()

    try:
        # 모델 로드
        if not detector.load_model():
            raise ValueError("LayoutParser 모델 로드 실패")

        # PDF 열기
        if not detector.open(pdf_path):
            raise ValueError(f"PDF 파일을 열 수 없음: {pdf_path}")

        # 레이아웃 감지
        blocks = detector.detect_layout(page_num)
        return blocks

    finally:
        detector.close()


# 테스트용 메인
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("사용법: python layout_detector.py <pdf_file_path> <page_num>")
        sys.exit(1)

    pdf_file = sys.argv[1]
    page_num = int(sys.argv[2])

    # 로깅 설정
    logging.basicConfig(level=logging.INFO)

    # 레이아웃 감지
    blocks = detect_pdf_layout(pdf_file, page_num)

    # 결과 출력
    print(f"\n{'='*60}")
    print(f"페이지 {page_num} 레이아웃 감지 결과")
    print(f"총 {len(blocks)}개 블록 감지")
    print(f"{'='*60}\n")

    for i, block in enumerate(blocks, 1):
        print(
            f"{i}. [{block.block_type}] "
            f"위치: ({block.bbox.x0:.1f}, {block.bbox.y0:.1f}) - "
            f"({block.bbox.x1:.1f}, {block.bbox.y1:.1f}) "
            f"신뢰도: {block.confidence:.2f}"
        )