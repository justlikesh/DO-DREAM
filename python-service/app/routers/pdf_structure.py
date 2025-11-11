"""
PDF structure extraction API endpoints.
Provides endpoints for extracting structured content from PDFs.
"""

import logging
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import httpx

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from app.services.pdf_analyzer import PDFAnalyzer
from app.services.heading_detector import HeadingDetector
# from app.services.layout_detector import LayoutDetector  # Optional: Requires layoutparser
from app.services.reading_order import ReadingOrderRestorer, TextBlockOrderRestorer
# from app.services.table_extractor import TableExtractor  # Optional: Requires camelot-py
from app.services.tiptap_converter import TipTapConverter
from app.services.gemini_pdf_parser import GeminiPDFParser

logger = logging.getLogger(__name__)

# Conditional imports for optional features
try:
    from app.services.layout_detector import LayoutDetector
    LAYOUT_DETECTOR_AVAILABLE = True
except ImportError:
    LAYOUT_DETECTOR_AVAILABLE = False
    logger.warning("LayoutDetector not available (layoutparser not installed)")

try:
    from app.services.table_extractor import TableExtractor
    TABLE_EXTRACTOR_AVAILABLE = True
except ImportError:
    TABLE_EXTRACTOR_AVAILABLE = False
    logger.warning("TableExtractor not available (camelot-py not installed)")

try:
    from app.services.structured_book_extractor import StructuredBookExtractor
    STRUCTURED_BOOK_EXTRACTOR_AVAILABLE = True
except ImportError:
    STRUCTURED_BOOK_EXTRACTOR_AVAILABLE = False
    logger.warning("StructuredBookExtractor not available")

router = APIRouter(prefix="/api/pdf", tags=["pdf-structure"])


# Request/Response models
class ExtractStructureRequest(BaseModel):
    """Request model for structure extraction"""
    pdfUrl: str = Field(..., description="URL to download the PDF file")
    options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Extraction options")


class ExtractStructureResponse(BaseModel):
    """Response model for structure extraction"""
    tiptapJson: Dict[str, Any] = Field(..., description="TipTap editor JSON")
    toc: List[Dict[str, Any]] = Field(..., description="Table of contents")
    metadata: Dict[str, Any] = Field(..., description="Extraction metadata")
    tables: List[Dict[str, Any]] = Field(default_factory=list, description="Extracted tables")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str = "1.0.0"
    services: Dict[str, bool]


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns the status of the service and its dependencies.
    """
    # Check service availability
    services = {
        "pdf_analyzer": True,
        "heading_detector": True,
        "layout_detector": False,  # May not be loaded
        "table_extractor": False,  # May not have dependencies
        "tiptap_converter": True
    }

    # Check LayoutParser
    if LAYOUT_DETECTOR_AVAILABLE:
        try:
            detector = LayoutDetector()
            services["layout_detector"] = detector.model is not None
        except Exception:
            pass

    # Check Table Extractor
    if TABLE_EXTRACTOR_AVAILABLE:
        try:
            extractor = TableExtractor()
            services["table_extractor"] = extractor.camelot_available or extractor.tabula_available
        except Exception:
            pass

    return HealthResponse(
        status="ok",
        services=services
    )


@router.post("/extract-structure", response_model=ExtractStructureResponse)
async def extract_structure(request: ExtractStructureRequest):
    """
    Extract structured content from a PDF file.

    This endpoint downloads a PDF from the provided URL, analyzes its structure,
    and returns a TipTap-compatible JSON document with headings, paragraphs, tables, etc.

    Pipeline:
    1. Download PDF from URL
    2. Check for text layer (PyMuPDF)
    3a. If text layer exists: Extract text + fonts, detect headings
    3b. If no text layer: Use LayoutParser + OCR
    4. Extract tables (Camelot/Tabula)
    5. Restore reading order
    6. Convert to TipTap JSON
    7. Return structured document
    """
    pdf_path = None

    try:
        logger.info(f"Starting structure extraction for PDF: {request.pdfUrl}")

        # Step 1: Download PDF
        pdf_path = await download_pdf(request.pdfUrl)
        logger.info(f"Downloaded PDF to: {pdf_path}")

        # Get options
        options = request.options or {}
        use_ocr = options.get('useOcr', False)
        extract_tables = options.get('extractTables', True)
        add_toc = options.get('addTableOfContents', False)

        # Step 2: Analyze PDF
        analyzer = PDFAnalyzer()
        analyzer.open(str(pdf_path))
        doc_analysis = analyzer.analyze_document()

        # Determine extraction method
        has_text_layer = doc_analysis.has_text_layer
        extraction_method = "text_layer" if has_text_layer else "ocr"

        logger.info(f"PDF has text layer: {has_text_layer}")
        logger.info(f"Extraction method: {extraction_method}")

        # Initialize converters
        tiptap_converter = TipTapConverter()
        toc_entries = []
        all_tables = []

        if has_text_layer and not use_ocr:
            # Text layer extraction path
            logger.info("Using text layer extraction")

            # Step 3: Detect headings
            heading_detector = HeadingDetector()
            toc_entries = heading_detector.detect_headings_from_document(
                doc_analysis,
                use_reference_position=True,  # 참조 위치 기반 필터링 사용
                reference_y_min=70.5,  # y 좌표 최소값 (사용자 제공: 70.5977)
                reference_y_max=71.0   # y 좌표 최대값 (사용자 제공: 70.6514)
            )
            logger.info(f"Detected {len(toc_entries)} headings (reference position based)")

            # Step 4: Restore reading order for text blocks
            all_text_blocks = []
            for page_analysis in doc_analysis.pages:
                all_text_blocks.extend(page_analysis.text_blocks)

            # Get page dimensions (use first page as reference)
            page_width = doc_analysis.pages[0].width if doc_analysis.pages else 612.0  # Default A4 width
            page_height = doc_analysis.pages[0].height if doc_analysis.pages else 792.0  # Default A4 height

            order_restorer = TextBlockOrderRestorer()
            ordered_blocks = order_restorer.restore_reading_order(all_text_blocks, page_width, page_height)
            logger.info(f"Restored reading order for {len(ordered_blocks)} text blocks")

            # Step 5: Extract tables if requested
            if extract_tables:
                table_extractor = TableExtractor()
                for page_num in range(1, doc_analysis.total_pages + 1):
                    page_tables = table_extractor.extract_tables_from_page(
                        str(pdf_path),
                        page_num
                    )
                    all_tables.extend(page_tables)
                logger.info(f"Extracted {len(all_tables)} tables")

            # Step 6: Convert to TipTap JSON
            tiptap_doc = tiptap_converter.convert_text_blocks_to_tiptap(
                ordered_blocks,
                [entry.to_dict() for entry in toc_entries]
            )

            # Add tables to document
            if all_tables:
                for table in all_tables:
                    table_node = tiptap_converter.create_table_node(table)
                    # Insert table at appropriate position (simplified: append to end)
                    tiptap_doc["content"].append(table_node)

        else:
            # OCR + LayoutParser path
            logger.info("Using OCR + LayoutParser extraction")

            layout_detector = LayoutDetector()
            layout_detector.load_pdf(str(pdf_path))

            all_layout_blocks = []

            # Process each page
            for page_num in range(1, doc_analysis.total_pages + 1):
                # Detect layout
                layout_blocks = layout_detector.detect_layout(page_num)
                all_layout_blocks.extend(layout_blocks)

                # Extract tables
                if extract_tables:
                    table_extractor = TableExtractor()
                    page_tables = table_extractor.extract_tables_from_page(
                        str(pdf_path),
                        page_num
                    )
                    all_tables.extend(page_tables)

            logger.info(f"Detected {len(all_layout_blocks)} layout blocks")

            # Restore reading order
            order_restorer = ReadingOrderRestorer()
            ordered_blocks = order_restorer.restore_reading_order(all_layout_blocks)

            # Detect headings from layout blocks
            heading_detector = HeadingDetector()
            # Extract heading candidates from layout blocks
            for block in ordered_blocks:
                if block.block_type.lower() in ["heading", "title"]:
                    # Create TOCEntry-like dict
                    toc_entries.append({
                        "title": block.text,
                        "level": 1,  # Default level, could be refined
                        "pageNum": block.page_num,
                        "confidence": block.confidence
                    })

            logger.info(f"Detected {len(toc_entries)} headings from layout")

            # Convert to TipTap
            tiptap_doc = tiptap_converter.convert_layout_blocks_to_tiptap(
                ordered_blocks,
                toc_entries,
                all_tables
            )

        # Step 7: Add table of contents if requested
        if add_toc and toc_entries:
            tiptap_doc = tiptap_converter.add_table_of_contents(tiptap_doc, toc_entries)

        # Prepare metadata
        metadata = {
            "pageCount": doc_analysis.total_pages,
            "hasTextLayer": has_text_layer,
            "extractionMethod": extraction_method,
            "headingCount": len(toc_entries),
            "tableCount": len(all_tables),
            "blockCount": len(tiptap_doc.get("content", [])),
            "avgFontSize": doc_analysis.global_avg_font_size if has_text_layer else None
        }

        # Convert tables to JSON
        tables_json = []
        if all_tables:
            table_extractor = TableExtractor()
            tables_json = table_extractor.tables_to_json(all_tables)

        # Convert TOC entries to dicts
        toc_json = []
        for entry in toc_entries:
            if hasattr(entry, 'to_dict'):
                toc_json.append(entry.to_dict())
            else:
                toc_json.append(entry)

        logger.info("Structure extraction completed successfully")

        return ExtractStructureResponse(
            tiptapJson=tiptap_doc,
            toc=toc_json,
            metadata=metadata,
            tables=tables_json
        )

    except Exception as e:
        logger.error(f"Error extracting structure: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Structure extraction failed: {str(e)}")

    finally:
        # Clean up temporary file
        if pdf_path and Path(pdf_path).exists():
            try:
                Path(pdf_path).unlink()
                logger.info(f"Cleaned up temporary file: {pdf_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temporary file: {e}")


@router.post("/extract-headings")
async def extract_headings_only(request: ExtractStructureRequest):
    """
    Extract only headings/table of contents from a PDF.
    Faster than full structure extraction.
    """
    pdf_path = None

    try:
        logger.info(f"Extracting headings from PDF: {request.pdfUrl}")

        # Download PDF
        pdf_path = await download_pdf(request.pdfUrl)

        # Analyze PDF
        analyzer = PDFAnalyzer()
        analyzer.open(str(pdf_path))
        doc_analysis = analyzer.analyze_document()

        # Detect headings
        heading_detector = HeadingDetector()
        toc_entries = heading_detector.detect_headings_from_document(doc_analysis)

        # Convert to JSON
        toc_json = [entry.to_dict() for entry in toc_entries]

        return JSONResponse(content={
            "toc": toc_json,
            "metadata": {
                "pageCount": doc_analysis.total_pages,
                "headingCount": len(toc_entries)
            }
        })

    except Exception as e:
        logger.error(f"Error extracting headings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Heading extraction failed: {str(e)}")

    finally:
        if pdf_path and Path(pdf_path).exists():
            Path(pdf_path).unlink()


async def download_pdf(url: str) -> Path:
    """
    Download PDF from URL to temporary file.

    Args:
        url: URL to download from

    Returns:
        Path to downloaded PDF file
    """
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:  # 5 minute timeout
            response = await client.get(url)
            response.raise_for_status()

            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_file.write(response.content)
            temp_file.close()

            return Path(temp_file.name)

    except httpx.HTTPError as e:
        logger.error(f"Failed to download PDF from {url}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to download PDF: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error downloading PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.post("/extract-structured-book")
async def extract_structured_book(request: ExtractStructureRequest):
    """
    Extract hierarchical book structure from educational PDF.

    This endpoint is designed for textbooks and educational materials with:
    - TOC on first 1-2 pages
    - Hierarchical structure: index -> title -> s_title -> ss_title
    - Number patterns: "1.", "(1)", "1." for different levels

    Returns custom JSON format with hierarchical content structure.
    """
    # Check if StructuredBookExtractor is available
    if not STRUCTURED_BOOK_EXTRACTOR_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="StructuredBookExtractor is not available. Please install required dependencies."
        )

    pdf_path = None

    try:
        logger.info(f"Starting structured book extraction for PDF: {request.pdfUrl}")

        # Download PDF
        pdf_path = await download_pdf(request.pdfUrl)
        logger.info(f"Downloaded PDF to: {pdf_path}")

        # Get options
        options = request.options or {}
        toc_start_page = options.get('tocStartPage', 1)
        toc_end_page = options.get('tocEndPage', 2)

        # Extract structured content
        extractor = StructuredBookExtractor()
        result = extractor.extract_structured_content(
            str(pdf_path),
            toc_pages=(toc_start_page, toc_end_page)
        )

        logger.info(f"Structured extraction completed: {result['metadata']['total_indexes']} indexes")

        return JSONResponse(content=result)

    except Exception as e:
        logger.error(f"Error extracting structured book: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Structured book extraction failed: {str(e)}")

    finally:
        # Clean up temporary file
        if pdf_path and Path(pdf_path).exists():
            try:
                Path(pdf_path).unlink()
                logger.info(f"Cleaned up temporary file: {pdf_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temporary file: {e}")


@router.post("/debug-toc")
async def debug_toc_structure(request: ExtractStructureRequest):
    """
    Debug endpoint to analyze TOC structure.
    Returns raw text blocks from first 2 pages for inspection.
    """
    pdf_path = None

    try:
        logger.info(f"Starting TOC debug for PDF: {request.pdfUrl}")

        # Download PDF
        pdf_path = await download_pdf(request.pdfUrl)

        # Analyze PDF
        analyzer = PDFAnalyzer()
        analyzer.open(str(pdf_path))
        doc_analysis = analyzer.analyze_document()

        debug_data = {
            "total_pages": doc_analysis.total_pages,
            "pages": []
        }

        # Extract first 2 pages
        for page_num in range(min(2, doc_analysis.total_pages)):
            page = doc_analysis.pages[page_num]
            page_data = {
                "page_num": page_num + 1,
                "blocks": []
            }

            # Get first 50 text blocks
            for i, block in enumerate(page.text_blocks[:50]):
                text = block.text.strip()
                if not text:
                    continue

                block_data = {
                    "index": i + 1,
                    "text": text,
                    "font": {
                        "name": block.font.name,
                        "size": round(block.font.size, 2),
                        "bold": block.font.is_bold,
                        "italic": block.font.is_italic
                    },
                    "bbox": {
                        "y0": round(block.bbox.y0, 2)
                    }
                }
                page_data["blocks"].append(block_data)

            debug_data["pages"].append(page_data)

        analyzer.close()

        return JSONResponse(content=debug_data)

    except Exception as e:
        logger.error(f"Error debugging TOC: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"TOC debug failed: {str(e)}")

    finally:
        if pdf_path and Path(pdf_path).exists():
            Path(pdf_path).unlink()


# ==================== Gemini PDF Parsing Endpoints ====================

class GeminiParseRequest(BaseModel):
    """Request model for Gemini PDF parsing"""
    pdfUrl: str = Field(..., description="URL to download the PDF file")
    outputFormat: Optional[str] = Field(None, description="Custom output JSON format")
    customPrompt: Optional[str] = Field(None, description="Custom parsing prompt")


class GeminiParseResponse(BaseModel):
    """Response model for Gemini PDF parsing"""
    filename: str = Field(..., description="Original filename")
    parsedData: Dict[str, Any] = Field(..., description="Parsed JSON data from Gemini")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Parsing metadata")


@router.post("/parse-pdf-gemini", response_model=GeminiParseResponse)
async def parse_pdf_with_gemini(request: GeminiParseRequest):
    """
    Parse PDF using Google Gemini 2.5 Flash model.

    This endpoint uses Gemini's multimodal capabilities to:
    1. Read and understand PDF content
    2. Extract hierarchical structure (index -> title -> s_title -> ss_title)
    3. Return structured JSON according to specified format

    Ideal for educational materials and textbooks with complex structure.

    Args:
        request: GeminiParseRequest with pdfUrl and optional outputFormat

    Returns:
        GeminiParseResponse with parsed structured data
    """
    pdf_path = None

    try:
        logger.info(f"Starting Gemini PDF parsing for: {request.pdfUrl}")

        # Step 1: Download PDF
        pdf_path = await download_pdf(request.pdfUrl)
        logger.info(f"Downloaded PDF to: {pdf_path}")

        # Extract filename from URL
        filename = request.pdfUrl.split('/')[-1]
        if not filename.endswith('.pdf'):
            filename = "document.pdf"

        # Step 2: Initialize Gemini parser
        try:
            parser = GeminiPDFParser()
        except ValueError as e:
            logger.error(f"Gemini API key not configured: {e}")
            raise HTTPException(
                status_code=500,
                detail="Gemini API가 설정되지 않았습니다. GEMINI_API_KEY를 환경변수에 설정하세요."
            )

        # Step 3: Parse PDF with Gemini
        if request.customPrompt:
            # Use custom prompt
            logger.info("Using custom prompt for Gemini parsing")
            parsed_data = parser.parse_pdf_with_custom_prompt(
                str(pdf_path),
                request.customPrompt
            )
        else:
            # Use default or provided output format
            logger.info("Using default format for Gemini parsing")
            parsed_data = parser.parse_pdf(
                str(pdf_path),
                request.outputFormat
            )

        # Prepare metadata
        metadata = {
            "model": "gemini-2.5-flash",
            "extractionMethod": "gemini_multimodal",
            "customPrompt": request.customPrompt is not None,
            "customFormat": request.outputFormat is not None
        }

        logger.info("Gemini PDF parsing completed successfully")

        return GeminiParseResponse(
            filename=filename,
            parsedData=parsed_data,
            metadata=metadata
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise

    except Exception as e:
        logger.error(f"Error parsing PDF with Gemini: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Gemini PDF parsing failed: {str(e)}"
        )

    finally:
        # Clean up temporary file
        if pdf_path and Path(pdf_path).exists():
            try:
                Path(pdf_path).unlink()
                logger.info(f"Cleaned up temporary file: {pdf_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temporary file: {e}")


@router.post("/parse-pdf-gemini-upload")
async def parse_pdf_with_gemini_upload(
    file: UploadFile = File(...),
    output_format: Optional[str] = None,
    custom_prompt: Optional[str] = None
):
    """
    Parse uploaded PDF file using Google Gemini.

    Alternative endpoint that accepts file upload instead of URL.

    Args:
        file: Uploaded PDF file
        output_format: Optional custom JSON format
        custom_prompt: Optional custom parsing prompt

    Returns:
        Parsed JSON data
    """
    temp_path = None

    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="PDF 파일만 지원됩니다."
            )

        logger.info(f"Processing uploaded PDF: {file.filename}")

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        # Initialize Gemini parser
        try:
            parser = GeminiPDFParser()
        except ValueError as e:
            logger.error(f"Gemini API key not configured: {e}")
            raise HTTPException(
                status_code=500,
                detail="Gemini API가 설정되지 않았습니다. GEMINI_API_KEY를 환경변수에 설정하세요."
            )

        # Parse PDF
        if custom_prompt:
            parsed_data = parser.parse_pdf_with_custom_prompt(temp_path, custom_prompt)
        else:
            parsed_data = parser.parse_pdf(temp_path, output_format)

        return JSONResponse(content={
            "filename": file.filename,
            "parsedData": parsed_data,
            "metadata": {
                "model": "gemini-2.5-flash",
                "extractionMethod": "gemini_multimodal"
            }
        })

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error parsing uploaded PDF with Gemini: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Gemini PDF parsing failed: {str(e)}"
        )

    finally:
        # Clean up temporary file
        if temp_path and Path(temp_path).exists():
            try:
                Path(temp_path).unlink()
                logger.info(f"Cleaned up temporary file: {temp_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temporary file: {e}")