"""
TipTap JSON converter service.
Converts document structure (headings, paragraphs, tables, images) to TipTap editor JSON format.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from app.models.pdf_models import TextBlock, LayoutBlock
from app.services.table_extractor import ExtractedTable

logger = logging.getLogger(__name__)


class TipTapConverter:
    """Converts document structure to TipTap JSON format"""

    def __init__(self):
        pass


    def create_document(self, content: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create a TipTap document node.

        Args:
            content: List of content nodes (heading, paragraph, table, etc.)

        Returns:
            TipTap document JSON
        """
        return {
            "type": "doc",
            "content": content
        }


    def create_heading_node(
        self,
        text: str,
        level: int = 1,
        page_num: Optional[int] = None,
        confidence: Optional[float] = None,
        font_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a TipTap heading node.

        Args:
            text: Heading text
            level: Heading level (1-6)
            page_num: Source page number (for metadata)
            confidence: Detection confidence (0-1)
            font_info: Font information (name, size, bold, italic, color)

        Returns:
            TipTap heading node
        """
        node = {
            "type": "heading",
            "attrs": {
                "level": min(max(level, 1), 6)  # Clamp to 1-6
            },
            "content": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        }

        # Add metadata if provided
        if page_num is not None or confidence is not None or font_info is not None:
            node["attrs"]["metadata"] = {}
            if page_num is not None:
                node["attrs"]["metadata"]["pageNum"] = page_num
            if confidence is not None:
                node["attrs"]["metadata"]["confidence"] = round(confidence, 3)
            if font_info is not None:
                node["attrs"]["metadata"]["font"] = {
                    "name": font_info.get("name"),
                    "size": font_info.get("size"),
                    "bold": font_info.get("is_bold", False),
                    "italic": font_info.get("is_italic", False),
                    "color": font_info.get("color")
                }

        return node


    def create_paragraph_node(
        self,
        text: str,
        page_num: Optional[int] = None,
        confidence: Optional[float] = None,
        font_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a TipTap paragraph node.

        Args:
            text: Paragraph text
            page_num: Source page number
            confidence: Detection confidence
            font_info: Font information (name, size, bold, italic, color)

        Returns:
            TipTap paragraph node
        """
        if not text or not text.strip():
            return None

        node = {
            "type": "paragraph",
            "content": [
                {
                    "type": "text",
                    "text": text.strip()
                }
            ]
        }

        # Add metadata if provided
        if page_num is not None or confidence is not None or font_info is not None:
            node["attrs"] = {"metadata": {}}
            if page_num is not None:
                node["attrs"]["metadata"]["pageNum"] = page_num
            if confidence is not None:
                node["attrs"]["metadata"]["confidence"] = round(confidence, 3)
            if font_info is not None:
                node["attrs"]["metadata"]["font"] = {
                    "name": font_info.get("name"),
                    "size": font_info.get("size"),
                    "bold": font_info.get("is_bold", False),
                    "italic": font_info.get("is_italic", False),
                    "color": font_info.get("color")
                }

        return node


    def create_table_node(
        self,
        table: ExtractedTable
    ) -> Dict[str, Any]:
        """
        Create a TipTap table node from ExtractedTable.

        Args:
            table: ExtractedTable object

        Returns:
            TipTap table node
        """
        # Create table rows
        table_rows = []

        # Add header row if exists
        if table.headers:
            header_cells = [
                {
                    "type": "tableHeader",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": str(header)}]
                        }
                    ]
                }
                for header in table.headers
            ]
            table_rows.append({
                "type": "tableRow",
                "content": header_cells
            })

        # Add data rows
        for row in table.rows:
            cells = [
                {
                    "type": "tableCell",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": str(cell)}]
                        }
                    ]
                }
                for cell in row
            ]
            table_rows.append({
                "type": "tableRow",
                "content": cells
            })

        # Create table node
        node = {
            "type": "table",
            "content": table_rows,
            "attrs": {
                "metadata": {
                    "pageNum": table.page_num,
                    "confidence": round(table.confidence, 3),
                    "extractionMethod": table.extraction_method
                }
            }
        }

        return node


    def create_image_node(
        self,
        image_url: str,
        caption: Optional[str] = None,
        page_num: Optional[int] = None,
        alt_text: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Create TipTap image node(s).

        Args:
            image_url: URL or path to the image
            caption: Optional caption text
            page_num: Source page number
            alt_text: Alternative text for accessibility

        Returns:
            List of nodes (image + optional caption paragraph)
        """
        nodes = []

        # Image node
        image_node = {
            "type": "image",
            "attrs": {
                "src": image_url,
                "alt": alt_text or caption or "Image",
                "title": caption
            }
        }

        if page_num is not None:
            image_node["attrs"]["metadata"] = {"pageNum": page_num}

        nodes.append(image_node)

        # Caption as paragraph if provided
        if caption:
            caption_node = self.create_paragraph_node(
                f"Figure: {caption}",
                page_num=page_num
            )
            if caption_node:
                nodes.append(caption_node)

        return nodes


    def create_divider_node(self) -> Dict[str, Any]:
        """Create a horizontal rule/divider node"""
        return {
            "type": "horizontalRule"
        }


    def create_blockquote_node(self, text: str) -> Dict[str, Any]:
        """Create a blockquote node"""
        return {
            "type": "blockquote",
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": text}]
                }
            ]
        }


    def convert_text_blocks_to_tiptap(
        self,
        text_blocks: List[TextBlock],
        headings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Convert text blocks and headings to TipTap document.

        Args:
            text_blocks: List of TextBlock objects (from PDF text layer)
            headings: List of heading dictionaries with title, level, pageNum

        Returns:
            Complete TipTap document
        """
        content = []

        # Create a mapping of page_num to blocks
        blocks_by_page = {}
        for block in text_blocks:
            page_num = getattr(block, 'page_num', 1)
            if page_num not in blocks_by_page:
                blocks_by_page[page_num] = []
            blocks_by_page[page_num].append(block)

        # Create heading index by (pageNum, text)
        heading_index = {
            (h.get('pageNum'), h.get('title')): h
            for h in headings
        }

        # Process blocks in order
        for page_num in sorted(blocks_by_page.keys()):
            for block in blocks_by_page[page_num]:
                text = block.text.strip()
                if not text:
                    continue

                # Check if this block is a heading
                heading_info = heading_index.get((page_num, text))
                if heading_info:
                    node = self.create_heading_node(
                        text=text,
                        level=heading_info.get('level', 1),
                        page_num=page_num,
                        confidence=heading_info.get('confidence')
                    )
                else:
                    # Regular paragraph
                    # Convert FontInfo to dict
                    font_dict = None
                    if hasattr(block, 'font') and block.font:
                        font_dict = {
                            'name': block.font.name,
                            'size': block.font.size,
                            'is_bold': block.font.is_bold,
                            'is_italic': block.font.is_italic,
                            'color': block.font.color
                        }

                    node = self.create_paragraph_node(
                        text=text,
                        page_num=page_num,
                        font_info=font_dict
                    )

                if node:
                    content.append(node)

        return self.create_document(content)


    def convert_layout_blocks_to_tiptap(
        self,
        layout_blocks: List[LayoutBlock],
        headings: List[Dict[str, Any]],
        tables: List[ExtractedTable]
    ) -> Dict[str, Any]:
        """
        Convert layout blocks (from LayoutParser) to TipTap document.

        Args:
            layout_blocks: List of LayoutBlock objects
            headings: Detected headings
            tables: Extracted tables

        Returns:
            Complete TipTap document
        """
        content = []

        # Create table index by page_num
        tables_by_page = {}
        for table in tables:
            page = table.page_num
            if page not in tables_by_page:
                tables_by_page[page] = []
            tables_by_page[page].append(table)

        # Process layout blocks
        for block in layout_blocks:
            block_type = block.block_type.lower()

            if block_type == "heading" or block_type == "title":
                # Find corresponding heading info
                heading_info = None
                for h in headings:
                    if h.get('pageNum') == block.page_num:
                        heading_info = h
                        break

                level = heading_info.get('level', 1) if heading_info else 1
                node = self.create_heading_node(
                    text=block.text,
                    level=level,
                    page_num=block.page_num,
                    confidence=block.confidence
                )
                content.append(node)

            elif block_type == "paragraph" or block_type == "text":
                node = self.create_paragraph_node(
                    text=block.text,
                    page_num=block.page_num,
                    confidence=block.confidence
                )
                if node:
                    content.append(node)

            elif block_type == "table":
                # Find corresponding extracted table
                page_tables = tables_by_page.get(block.page_num, [])
                if page_tables:
                    # Use the first table on this page (can be improved with bbox matching)
                    table = page_tables[0]
                    node = self.create_table_node(table)
                    content.append(node)
                else:
                    # No structured table data, add placeholder
                    node = self.create_paragraph_node(
                        text=f"[Table on page {block.page_num}]",
                        page_num=block.page_num,
                        confidence=block.confidence
                    )
                    if node:
                        content.append(node)

            elif block_type == "figure" or block_type == "image":
                # For now, add placeholder (image extraction would require separate processing)
                caption = block.text if block.text else None
                node = self.create_paragraph_node(
                    text=f"[Figure: {caption}]" if caption else f"[Figure on page {block.page_num}]",
                    page_num=block.page_num,
                    confidence=block.confidence
                )
                if node:
                    content.append(node)

        return self.create_document(content)


    def merge_content_by_headings(
        self,
        tiptap_doc: Dict[str, Any],
        group_by_headings: bool = True
    ) -> Dict[str, Any]:
        """
        Optionally restructure content to group paragraphs under headings.

        Args:
            tiptap_doc: TipTap document
            group_by_headings: If True, group content under section headings

        Returns:
            Restructured TipTap document
        """
        if not group_by_headings:
            return tiptap_doc

        # This is a simple implementation
        # More advanced version could create nested structures
        return tiptap_doc


    def add_table_of_contents(
        self,
        tiptap_doc: Dict[str, Any],
        headings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Add a table of contents at the beginning of the document.

        Args:
            tiptap_doc: TipTap document
            headings: List of headings

        Returns:
            Document with TOC prepended
        """
        if not headings:
            return tiptap_doc

        toc_content = [
            self.create_heading_node("Table of Contents", level=1),
        ]

        # Add TOC entries as a bullet list
        toc_items = []
        for heading in headings:
            indent = "  " * (heading.get('level', 1) - 1)
            text = f"{indent}{heading.get('title', '')}"
            toc_items.append({
                "type": "listItem",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": text}]
                    }
                ]
            })

        if toc_items:
            toc_content.append({
                "type": "bulletList",
                "content": toc_items
            })

        # Add divider
        toc_content.append(self.create_divider_node())

        # Prepend to document
        new_doc = tiptap_doc.copy()
        new_doc["content"] = toc_content + new_doc.get("content", [])

        return new_doc


# Test function
def test_converter():
    """Test TipTap converter"""
    converter = TipTapConverter()

    # Test heading
    heading = converter.create_heading_node("Chapter 1: Introduction", level=1, page_num=1)
    print("Heading node:", heading)

    # Test paragraph
    para = converter.create_paragraph_node("This is a sample paragraph.", page_num=1)
    print("\nParagraph node:", para)

    # Test document
    doc = converter.create_document([heading, para])
    print("\nDocument:", doc)


if __name__ == "__main__":
    test_converter()