"""
Table extraction service using Camelot and Tabula.
Extracts structured table data from PDF pages.
"""

import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import pandas as pd
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class TableCell:
    """Represents a single table cell"""
    text: str
    row: int
    col: int
    rowspan: int = 1
    colspan: int = 1


@dataclass
class ExtractedTable:
    """Represents an extracted table with metadata"""
    headers: List[str]
    rows: List[List[str]]
    page_num: int
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    confidence: float
    extraction_method: str  # 'camelot' or 'tabula'


class TableExtractor:
    """Extracts and structures tables from PDF pages"""

    def __init__(self):
        self.camelot_available = False
        self.tabula_available = False

        # Try to import Camelot
        try:
            import camelot
            self.camelot = camelot
            self.camelot_available = True
            logger.info("Camelot library loaded successfully")
        except ImportError:
            logger.warning("Camelot not available, will use Tabula as fallback")

        # Try to import Tabula
        try:
            import tabula
            self.tabula = tabula
            self.tabula_available = True
            logger.info("Tabula library loaded successfully")
        except ImportError:
            logger.warning("Tabula not available")


    def extract_tables_from_page(
        self,
        pdf_path: str,
        page_num: int,
        bbox: Optional[Tuple[float, float, float, float]] = None
    ) -> List[ExtractedTable]:
        """
        Extract all tables from a specific page.

        Args:
            pdf_path: Path to the PDF file
            page_num: Page number (1-indexed)
            bbox: Optional bounding box to extract from (x1, y1, x2, y2)

        Returns:
            List of ExtractedTable objects
        """
        tables = []

        # Try Camelot first (more accurate for line-based tables)
        if self.camelot_available:
            camelot_tables = self._extract_with_camelot(pdf_path, page_num, bbox)
            tables.extend(camelot_tables)

        # If Camelot didn't find tables, try Tabula
        if not tables and self.tabula_available:
            tabula_tables = self._extract_with_tabula(pdf_path, page_num, bbox)
            tables.extend(tabula_tables)

        logger.info(f"Extracted {len(tables)} tables from page {page_num}")
        return tables


    def _extract_with_camelot(
        self,
        pdf_path: str,
        page_num: int,
        bbox: Optional[Tuple[float, float, float, float]] = None
    ) -> List[ExtractedTable]:
        """Extract tables using Camelot (line-based detection)"""
        try:
            # Convert page number to string for Camelot (1-indexed)
            page_str = str(page_num)

            # Try lattice mode first (for tables with lines)
            tables_lattice = self.camelot.read_pdf(
                pdf_path,
                pages=page_str,
                flavor='lattice',
                suppress_stdout=True
            )

            extracted = []

            # Process lattice tables
            for table in tables_lattice:
                if table.accuracy > 50:  # Only accept tables with >50% accuracy
                    extracted_table = self._camelot_table_to_extracted(
                        table, page_num, 'camelot-lattice'
                    )
                    if extracted_table:
                        extracted.append(extracted_table)

            # If no good lattice tables found, try stream mode (for tables without lines)
            if not extracted:
                tables_stream = self.camelot.read_pdf(
                    pdf_path,
                    pages=page_str,
                    flavor='stream',
                    suppress_stdout=True
                )

                for table in tables_stream:
                    if table.accuracy > 40:  # Lower threshold for stream mode
                        extracted_table = self._camelot_table_to_extracted(
                            table, page_num, 'camelot-stream'
                        )
                        if extracted_table:
                            extracted.append(extracted_table)

            logger.info(f"Camelot extracted {len(extracted)} tables from page {page_num}")
            return extracted

        except Exception as e:
            logger.error(f"Camelot extraction failed for page {page_num}: {e}")
            return []


    def _extract_with_tabula(
        self,
        pdf_path: str,
        page_num: int,
        bbox: Optional[Tuple[float, float, float, float]] = None
    ) -> List[ExtractedTable]:
        """Extract tables using Tabula (stream-based detection)"""
        try:
            # Tabula uses 1-indexed pages
            dfs = self.tabula.read_pdf(
                pdf_path,
                pages=page_num,
                multiple_tables=True,
                pandas_options={'header': None}
            )

            extracted = []
            for idx, df in enumerate(dfs):
                if df.empty or len(df) < 2:
                    continue

                # Convert DataFrame to ExtractedTable
                headers = []
                rows = []

                # Check if first row looks like a header
                first_row = df.iloc[0].astype(str).tolist()
                if self._is_likely_header(first_row):
                    headers = first_row
                    rows = df.iloc[1:].astype(str).values.tolist()
                else:
                    rows = df.astype(str).values.tolist()

                # Clean up the data
                headers = [str(h).strip() for h in headers]
                rows = [[str(cell).strip() for cell in row] for row in rows]

                # Estimate confidence (Tabula doesn't provide this)
                confidence = self._estimate_table_confidence(headers, rows)

                extracted_table = ExtractedTable(
                    headers=headers,
                    rows=rows,
                    page_num=page_num,
                    bbox=(0, 0, 0, 0),  # Tabula doesn't provide bbox
                    confidence=confidence,
                    extraction_method='tabula'
                )
                extracted.append(extracted_table)

            logger.info(f"Tabula extracted {len(extracted)} tables from page {page_num}")
            return extracted

        except Exception as e:
            logger.error(f"Tabula extraction failed for page {page_num}: {e}")
            return []


    def _camelot_table_to_extracted(
        self,
        camelot_table,
        page_num: int,
        method: str
    ) -> Optional[ExtractedTable]:
        """Convert Camelot table object to ExtractedTable"""
        try:
            df = camelot_table.df

            if df.empty or len(df) < 2:
                return None

            # Extract headers and rows
            headers = df.iloc[0].astype(str).tolist()
            rows = df.iloc[1:].astype(str).values.tolist()

            # Clean up
            headers = [str(h).strip() for h in headers]
            rows = [[str(cell).strip() for cell in row] for row in rows]

            # Get bounding box
            bbox = (0, 0, 0, 0)
            if hasattr(camelot_table, '_bbox'):
                bbox = tuple(camelot_table._bbox)

            return ExtractedTable(
                headers=headers,
                rows=rows,
                page_num=page_num,
                bbox=bbox,
                confidence=camelot_table.accuracy / 100.0,  # Convert to 0-1 scale
                extraction_method=method
            )

        except Exception as e:
            logger.error(f"Failed to convert Camelot table: {e}")
            return None


    def _is_likely_header(self, row: List[str]) -> bool:
        """Determine if a row is likely a table header"""
        if not row:
            return False

        # Headers typically have:
        # 1. Non-empty cells
        # 2. Text rather than just numbers
        # 3. Shorter text (not paragraphs)

        non_empty = sum(1 for cell in row if str(cell).strip() and str(cell).strip() != 'nan')
        has_text = sum(1 for cell in row if not str(cell).replace('.', '').replace('-', '').isdigit())

        return non_empty > len(row) * 0.5 and has_text > 0


    def _estimate_table_confidence(self, headers: List[str], rows: List[List[str]]) -> float:
        """Estimate confidence score for a table"""
        if not rows:
            return 0.0

        score = 0.5  # Base score

        # Good indicators
        if headers:
            score += 0.2

        # Consistent column count
        if rows:
            col_counts = [len(row) for row in rows]
            if len(set(col_counts)) == 1:  # All rows have same column count
                score += 0.2

        # Non-empty cells
        total_cells = sum(len(row) for row in rows)
        non_empty_cells = sum(1 for row in rows for cell in row if str(cell).strip() and str(cell) != 'nan')
        if total_cells > 0:
            fill_rate = non_empty_cells / total_cells
            score += fill_rate * 0.1

        return min(score, 1.0)


    def table_to_json(self, table: ExtractedTable) -> Dict:
        """Convert ExtractedTable to JSON format"""
        return {
            "headers": table.headers,
            "rows": table.rows,
            "pageNum": table.page_num,
            "bbox": {
                "x1": table.bbox[0],
                "y1": table.bbox[1],
                "x2": table.bbox[2],
                "y2": table.bbox[3]
            },
            "confidence": table.confidence,
            "extractionMethod": table.extraction_method,
            "rowCount": len(table.rows),
            "columnCount": len(table.rows[0]) if table.rows else 0
        }


    def tables_to_json(self, tables: List[ExtractedTable]) -> List[Dict]:
        """Convert list of tables to JSON format"""
        return [self.table_to_json(table) for table in tables]


# Test function for standalone execution
def test_extraction():
    """Test table extraction on a sample PDF"""
    import sys

    if len(sys.argv) < 3:
        print("Usage: python table_extractor.py <pdf_path> <page_num>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    page_num = int(sys.argv[2])

    extractor = TableExtractor()
    tables = extractor.extract_tables_from_page(pdf_path, page_num)

    print(f"\nFound {len(tables)} tables on page {page_num}:")
    for idx, table in enumerate(tables):
        print(f"\n=== Table {idx + 1} ===")
        print(f"Method: {table.extraction_method}")
        print(f"Confidence: {table.confidence:.2%}")
        print(f"Headers: {table.headers}")
        print(f"Rows: {len(table.rows)}")
        print(f"Preview:")
        for row in table.rows[:3]:
            print(f"  {row}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    test_extraction()