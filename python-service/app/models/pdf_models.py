"""
PDF 분석 관련 데이터 모델
"""

from typing import List, Optional, Tuple
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """바운딩 박스 (좌표)"""
    x0: float  # 왼쪽 하단 x
    y0: float  # 왼쪽 하단 y
    x1: float  # 오른쪽 상단 x
    y1: float  # 오른쪽 상단 y

    @property
    def width(self) -> float:
        """너비"""
        return self.x1 - self.x0

    @property
    def height(self) -> float:
        """높이"""
        return self.y1 - self.y0

    @property
    def center_x(self) -> float:
        """중심 x 좌표"""
        return (self.x0 + self.x1) / 2

    @property
    def center_y(self) -> float:
        """중심 y 좌표"""
        return (self.y0 + self.y1) / 2


class FontInfo(BaseModel):
    """폰트 정보"""
    name: str = Field(description="폰트 이름 (예: Times-Roman)")
    size: float = Field(description="폰트 크기 (pt)")
    is_bold: bool = Field(default=False, description="볼드 여부")
    is_italic: bool = Field(default=False, description="이탤릭 여부")
    color: Optional[int] = Field(default=None, description="텍스트 색상 (RGB)")


class TextBlock(BaseModel):
    """
    텍스트 블록 (PyMuPDF에서 추출)
    단어 또는 문장 단위의 텍스트 + 위치 + 폰트 정보
    """
    text: str = Field(description="텍스트 내용")
    bbox: BoundingBox = Field(description="바운딩 박스")
    font: FontInfo = Field(description="폰트 정보")
    page_num: int = Field(description="페이지 번호 (0부터 시작)")
    block_type: str = Field(default="text", description="블록 타입 (text, image, table 등)")
    confidence: float = Field(default=1.0, description="신뢰도 (0.0~1.0)")

    @property
    def is_heading_candidate(self, avg_font_size: float, threshold: float = 1.3) -> bool:
        """
        헤딩 후보 여부 판단
        폰트 크기가 평균의 threshold배 이상이면 헤딩 후보
        """
        return self.font.size >= avg_font_size * threshold


class PageAnalysis(BaseModel):
    """페이지 분석 결과"""
    page_num: int = Field(description="페이지 번호 (0부터 시작)")
    width: float = Field(description="페이지 너비")
    height: float = Field(description="페이지 높이")
    has_text_layer: bool = Field(description="텍스트 레이어 존재 여부")
    text_blocks: List[TextBlock] = Field(default_factory=list, description="텍스트 블록 목록")
    avg_font_size: float = Field(default=0.0, description="평균 폰트 크기")
    dominant_font: Optional[str] = Field(default=None, description="주요 폰트")

    def calculate_avg_font_size(self):
        """평균 폰트 크기 계산"""
        if not self.text_blocks:
            self.avg_font_size = 0.0
            return

        total_size = sum(block.font.size for block in self.text_blocks)
        self.avg_font_size = total_size / len(self.text_blocks)

    def get_heading_candidates(self, threshold: float = 1.3) -> List[TextBlock]:
        """
        헤딩 후보 텍스트 블록 추출
        폰트 크기가 평균의 threshold배 이상인 블록들
        """
        if self.avg_font_size == 0.0:
            self.calculate_avg_font_size()

        candidates = [
            block for block in self.text_blocks
            if block.font.size >= self.avg_font_size * threshold
        ]
        return candidates


class DocumentAnalysis(BaseModel):
    """전체 문서 분석 결과"""
    file_name: str = Field(description="파일명")
    total_pages: int = Field(description="총 페이지 수")
    has_text_layer: bool = Field(description="텍스트 레이어 존재 여부")
    pages: List[PageAnalysis] = Field(default_factory=list, description="페이지별 분석 결과")
    global_avg_font_size: float = Field(default=0.0, description="전체 문서 평균 폰트 크기")

    def calculate_global_avg_font_size(self):
        """전체 문서의 평균 폰트 크기 계산"""
        all_blocks = []
        for page in self.pages:
            all_blocks.extend(page.text_blocks)

        if not all_blocks:
            self.global_avg_font_size = 0.0
            return

        total_size = sum(block.font.size for block in all_blocks)
        self.global_avg_font_size = total_size / len(all_blocks)

    def get_all_heading_candidates(self, threshold: float = 1.3) -> List[TextBlock]:
        """전체 문서에서 헤딩 후보 추출"""
        if self.global_avg_font_size == 0.0:
            self.calculate_global_avg_font_size()

        candidates = []
        for page in self.pages:
            page_candidates = [
                block for block in page.text_blocks
                if block.font.size >= self.global_avg_font_size * threshold
            ]
            candidates.extend(page_candidates)

        return candidates


class LayoutBlock(BaseModel):
    """
    레이아웃 블록 (LayoutParser에서 추출)
    문단, 표, 그림 등의 레이아웃 요소
    """
    block_type: str = Field(description="블록 타입 (paragraph, heading, table, figure, caption)")
    bbox: BoundingBox = Field(description="바운딩 박스")
    page_num: int = Field(description="페이지 번호")
    confidence: float = Field(description="신뢰도 (0.0~1.0)")
    text: Optional[str] = Field(default=None, description="추출된 텍스트 (OCR 후)")
    order: int = Field(default=0, description="읽기 순서")