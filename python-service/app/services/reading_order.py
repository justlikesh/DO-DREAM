"""
읽기순서 복원 서비스

레이아웃 블록들의 읽기 순서를 올바르게 복원합니다.
- 컬럼 클러스터링 (좌 → 우)
- 컬럼 내부 Y 정렬 (상 → 하)
- 캡션 결합 (figure/table + caption)
- 헤더/풋터 제거
"""

import logging
from typing import List, Tuple, Optional
from sklearn.cluster import DBSCAN
import numpy as np

from app.models.pdf_models import LayoutBlock, TextBlock

logger = logging.getLogger(__name__)


class ReadingOrderRestorer:
    """읽기순서 복원 클래스"""

    def __init__(self):
        """초기화"""
        pass

    def cluster_columns(
        self,
        blocks: List[LayoutBlock],
        eps: float = 50.0
    ) -> List[List[LayoutBlock]]:
        """
        컬럼 클러스터링 (X 좌표 기반)

        다단 컬럼 문서에서 각 컬럼을 분리합니다.
        DBSCAN 클러스터링을 사용하여 X 좌표가 가까운 블록들을 그룹화합니다.

        Args:
            blocks: 레이아웃 블록 리스트
            eps: 클러스터링 거리 임계값 (포인트 단위)

        Returns:
            컬럼별로 그룹화된 블록 리스트
        """
        if not blocks:
            return []

        # 블록이 1개면 클러스터링 불필요
        if len(blocks) == 1:
            return [blocks]

        # X 좌표 중심점 추출
        x_centers = np.array([[block.bbox.center_x] for block in blocks])

        # DBSCAN 클러스터링
        clustering = DBSCAN(eps=eps, min_samples=1).fit(x_centers)
        labels = clustering.labels_

        # 클러스터별로 블록 그룹화
        clusters = {}
        for idx, label in enumerate(labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(blocks[idx])

        # 각 클러스터를 X 좌표 기준으로 정렬 (좌 → 우)
        sorted_clusters = []
        for label in sorted(clusters.keys()):
            cluster_blocks = clusters[label]
            # 클러스터의 평균 X 좌표 계산
            avg_x = sum(b.bbox.center_x for b in cluster_blocks) / len(cluster_blocks)
            sorted_clusters.append((avg_x, cluster_blocks))

        # X 좌표 기준으로 클러스터 정렬
        sorted_clusters.sort(key=lambda x: x[0])

        # 블록 리스트만 반환
        result = [cluster[1] for cluster in sorted_clusters]

        logger.info(f"컬럼 클러스터링 완료: {len(result)}개 컬럼 감지")
        return result

    def sort_blocks_by_y(
        self,
        blocks: List[LayoutBlock]
    ) -> List[LayoutBlock]:
        """
        블록을 Y 좌표 기준으로 정렬 (상 → 하)

        Args:
            blocks: 레이아웃 블록 리스트

        Returns:
            정렬된 블록 리스트
        """
        # Y0 좌표 기준으로 정렬 (작을수록 위쪽)
        sorted_blocks = sorted(blocks, key=lambda b: b.bbox.y0)
        return sorted_blocks

    def merge_captions(
        self,
        blocks: List[LayoutBlock]
    ) -> List[LayoutBlock]:
        """
        캡션 결합

        figure/table 블록 바로 뒤에 있는 caption 블록을 병합합니다.
        캡션 텍스트를 부모 블록의 text 필드에 추가합니다.

        Args:
            blocks: 레이아웃 블록 리스트 (Y 정렬된 상태)

        Returns:
            캡션이 병합된 블록 리스트
        """
        result = []
        i = 0

        while i < len(blocks):
            current_block = blocks[i]

            # figure 또는 table 블록인 경우
            if current_block.block_type in ["figure", "table"]:
                # 다음 블록이 caption인지 확인
                if i + 1 < len(blocks) and blocks[i + 1].block_type == "caption":
                    caption_block = blocks[i + 1]

                    # 캡션 텍스트를 현재 블록에 추가
                    if caption_block.text:
                        if current_block.text:
                            current_block.text += "\n" + caption_block.text
                        else:
                            current_block.text = caption_block.text

                    logger.info(
                        f"캡션 병합: {current_block.block_type} + caption "
                        f"(페이지 {current_block.page_num})"
                    )

                    # caption 블록은 스킵
                    i += 2
                    result.append(current_block)
                    continue

            result.append(current_block)
            i += 1

        logger.info(f"캡션 병합 완료: {len(blocks)} → {len(result)} 블록")
        return result

    def remove_headers_footers(
        self,
        blocks: List[LayoutBlock],
        page_height: float,
        header_threshold: float = 50.0,
        footer_threshold: float = 50.0
    ) -> List[LayoutBlock]:
        """
        헤더/풋터 제거

        페이지 상단/하단에 위치한 블록을 헤더/풋터로 간주하여 제거합니다.

        Args:
            blocks: 레이아웃 블록 리스트
            page_height: 페이지 높이
            header_threshold: 상단 임계값 (포인트)
            footer_threshold: 하단 임계값 (포인트)

        Returns:
            헤더/풋터가 제거된 블록 리스트
        """
        result = []

        for block in blocks:
            # 헤더 영역 (상단)
            if block.bbox.y0 < header_threshold:
                logger.debug(f"헤더 제거: {block.text[:30] if block.text else block.block_type}")
                continue

            # 풋터 영역 (하단)
            if block.bbox.y1 > page_height - footer_threshold:
                logger.debug(f"풋터 제거: {block.text[:30] if block.text else block.block_type}")
                continue

            result.append(block)

        logger.info(f"헤더/풋터 제거 완료: {len(blocks)} → {len(result)} 블록")
        return result

    def restore_reading_order(
        self,
        blocks: List[LayoutBlock],
        page_width: float,
        page_height: float,
        remove_headers_footers: bool = True
    ) -> List[LayoutBlock]:
        """
        읽기순서 복원 (전체 파이프라인)

        Args:
            blocks: 레이아웃 블록 리스트
            page_width: 페이지 너비
            page_height: 페이지 높이
            remove_headers_footers: 헤더/풋터 제거 여부

        Returns:
            읽기순서가 복원된 블록 리스트
        """
        if not blocks:
            return []

        logger.info(f"읽기순서 복원 시작: {len(blocks)} 블록")

        # 1. 헤더/풋터 제거
        if remove_headers_footers:
            blocks = self.remove_headers_footers(blocks, page_height)

        # 2. 컬럼 클러스터링 (좌 → 우)
        columns = self.cluster_columns(blocks)

        # 3. 각 컬럼 내부 정렬 (상 → 하)
        ordered_blocks = []
        for column in columns:
            sorted_column = self.sort_blocks_by_y(column)
            ordered_blocks.extend(sorted_column)

        # 4. 캡션 결합
        ordered_blocks = self.merge_captions(ordered_blocks)

        # 5. order 필드 재할당
        for idx, block in enumerate(ordered_blocks):
            block.order = idx

        logger.info(f"읽기순서 복원 완료: {len(ordered_blocks)} 블록")
        return ordered_blocks


# TextBlock용 읽기순서 복원 (PyMuPDF 텍스트)
class TextBlockOrderRestorer:
    """텍스트 블록 읽기순서 복원 클래스"""

    def __init__(self):
        """초기화"""
        pass

    def cluster_columns(
        self,
        blocks: List[TextBlock],
        eps: float = 50.0
    ) -> List[List[TextBlock]]:
        """
        컬럼 클러스터링 (X 좌표 기반)

        Args:
            blocks: 텍스트 블록 리스트
            eps: 클러스터링 거리 임계값

        Returns:
            컬럼별로 그룹화된 블록 리스트
        """
        if not blocks:
            return []

        if len(blocks) == 1:
            return [blocks]

        x_centers = np.array([[block.bbox.center_x] for block in blocks])
        clustering = DBSCAN(eps=eps, min_samples=1).fit(x_centers)
        labels = clustering.labels_

        clusters = {}
        for idx, label in enumerate(labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(blocks[idx])

        sorted_clusters = []
        for label in sorted(clusters.keys()):
            cluster_blocks = clusters[label]
            avg_x = sum(b.bbox.center_x for b in cluster_blocks) / len(cluster_blocks)
            sorted_clusters.append((avg_x, cluster_blocks))

        sorted_clusters.sort(key=lambda x: x[0])
        result = [cluster[1] for cluster in sorted_clusters]

        logger.info(f"텍스트 컬럼 클러스터링 완료: {len(result)}개 컬럼")
        return result

    def sort_blocks_by_y(
        self,
        blocks: List[TextBlock]
    ) -> List[TextBlock]:
        """
        블록을 Y 좌표 기준으로 정렬

        Args:
            blocks: 텍스트 블록 리스트

        Returns:
            정렬된 블록 리스트
        """
        sorted_blocks = sorted(blocks, key=lambda b: b.bbox.y0)
        return sorted_blocks

    def restore_reading_order(
        self,
        blocks: List[TextBlock],
        page_width: float,
        page_height: float
    ) -> List[TextBlock]:
        """
        텍스트 블록 읽기순서 복원

        Args:
            blocks: 텍스트 블록 리스트
            page_width: 페이지 너비
            page_height: 페이지 높이

        Returns:
            읽기순서가 복원된 블록 리스트
        """
        if not blocks:
            return []

        logger.info(f"텍스트 블록 읽기순서 복원 시작: {len(blocks)} 블록")

        # 1. 컬럼 클러스터링
        columns = self.cluster_columns(blocks)

        # 2. 각 컬럼 내부 정렬
        ordered_blocks = []
        for column in columns:
            sorted_column = self.sort_blocks_by_y(column)
            ordered_blocks.extend(sorted_column)

        logger.info(f"텍스트 블록 읽기순서 복원 완료: {len(ordered_blocks)} 블록")
        return ordered_blocks


# 편의 함수
def restore_layout_reading_order(
    blocks: List[LayoutBlock],
    page_width: float,
    page_height: float
) -> List[LayoutBlock]:
    """
    레이아웃 블록 읽기순서 복원 (편의 함수)

    Args:
        blocks: 레이아웃 블록 리스트
        page_width: 페이지 너비
        page_height: 페이지 높이

    Returns:
        읽기순서가 복원된 블록 리스트
    """
    restorer = ReadingOrderRestorer()
    return restorer.restore_reading_order(blocks, page_width, page_height)


def restore_text_reading_order(
    blocks: List[TextBlock],
    page_width: float,
    page_height: float
) -> List[TextBlock]:
    """
    텍스트 블록 읽기순서 복원 (편의 함수)

    Args:
        blocks: 텍스트 블록 리스트
        page_width: 페이지 너비
        page_height: 페이지 높이

    Returns:
        읽기순서가 복원된 블록 리스트
    """
    restorer = TextBlockOrderRestorer()
    return restorer.restore_reading_order(blocks, page_width, page_height)


# 테스트용 메인
if __name__ == "__main__":
    import sys
    from app.services.layout_detector import detect_pdf_layout

    if len(sys.argv) < 3:
        print("사용법: python reading_order.py <pdf_file_path> <page_num>")
        sys.exit(1)

    pdf_file = sys.argv[1]
    page_num = int(sys.argv[2])

    # 로깅 설정
    logging.basicConfig(level=logging.INFO)

    # 레이아웃 감지
    blocks = detect_pdf_layout(pdf_file, page_num)

    # 읽기순서 복원
    restorer = ReadingOrderRestorer()
    ordered_blocks = restorer.restore_reading_order(
        blocks,
        page_width=595,  # A4 기본값
        page_height=842
    )

    # 결과 출력
    print(f"\n{'='*60}")
    print(f"읽기순서 복원 결과: {len(ordered_blocks)} 블록")
    print(f"{'='*60}\n")

    for i, block in enumerate(ordered_blocks, 1):
        print(
            f"{i}. [order={block.order}] {block.block_type} "
            f"위치: ({block.bbox.x0:.0f}, {block.bbox.y0:.0f})"
        )