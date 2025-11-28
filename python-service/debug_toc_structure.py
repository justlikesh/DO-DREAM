"""
Debug script to analyze TOC structure in PDF
"""

import sys
from app.services.pdf_analyzer import PDFAnalyzer

if len(sys.argv) < 2:
    print("Usage: python debug_toc_structure.py <file_id>")
    print("Example: python debug_toc_structure.py 29")
    sys.exit(1)

file_id = sys.argv[1]

# For testing, we'll use a local PDF path
# You'll need to provide the actual path
pdf_path = f"test_files/file_{file_id}.pdf"

print(f"\n{'='*80}")
print(f"Analyzing TOC structure for file ID: {file_id}")
print(f"{'='*80}\n")

analyzer = PDFAnalyzer()

try:
    analyzer.open(pdf_path)
except:
    # If file doesn't exist, ask user for path
    print(f"Cannot find PDF at: {pdf_path}")
    print("\nPlease provide the PDF path or CloudFront URL")
    sys.exit(1)

doc_analysis = analyzer.analyze_document()

print(f"Total pages: {doc_analysis.total_pages}\n")

# Analyze first 2 pages (TOC)
for page_num in range(min(2, doc_analysis.total_pages)):
    page = doc_analysis.pages[page_num]
    print(f"\n{'='*80}")
    print(f"PAGE {page_num + 1}")
    print(f"{'='*80}\n")

    for i, block in enumerate(page.text_blocks[:30]):  # First 30 blocks
        text = block.text.strip()
        if not text:
            continue

        print(f"{i+1:3d}. [{block.font.name[:30]:30s}] "
              f"size={block.font.size:5.2f}pt "
              f"bold={str(block.font.is_bold):5s} "
              f"y={block.bbox.y0:7.2f}")
        print(f"     {text[:100]}")
        print()

analyzer.close()
print(f"\n{'='*80}\n")