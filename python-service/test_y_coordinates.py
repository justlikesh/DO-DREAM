"""
y 좌표 테스트 스크립트
모든 텍스트 블록의 y 좌표를 출력하여 확인
"""

import sys
from app.services.pdf_analyzer import PDFAnalyzer

if len(sys.argv) < 2:
    print("사용법: python test_y_coordinates.py <pdf_path>")
    sys.exit(1)

pdf_path = sys.argv[1]

analyzer = PDFAnalyzer()
analyzer.open(pdf_path)
doc_analysis = analyzer.analyze_document()

print(f"\n{'='*80}")
print(f"PDF: {doc_analysis.file_name}")
print(f"총 페이지: {doc_analysis.total_pages}")
print(f"{'='*80}\n")

# 첫 3페이지만 출력
for page_num in range(min(3, doc_analysis.total_pages)):
    page = doc_analysis.pages[page_num]
    print(f"\n📄 페이지 {page_num}:")
    print(f"   크기: {page.width} x {page.height}")
    print(f"   텍스트 블록: {len(page.text_blocks)}개\n")

    # y 좌표 70 근처의 블록만 출력
    for block in page.text_blocks:
        y = block.bbox.y0
        if 60 <= y <= 80:  # y 좌표 60~80 범위
            print(
                f"   y={y:7.4f} | font={block.font.name:30s} | "
                f"size={block.font.size:5.2f}pt | text='{block.text[:40]}'"
            )

analyzer.close()
print(f"\n{'='*80}\n")
