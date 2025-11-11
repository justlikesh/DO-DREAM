# PDF Structure Extraction Service (Python FastAPI)

PDF 문서의 구조를 분석하여 목차/헤딩/표/그림을 추출하고 TipTap 에디터용 JSON으로 변환하는 마이크로서비스

## 🎯 주요 기능

- **하이브리드 PDF 처리**: 텍스트 레이어 우선 → 없으면 OCR
- **레이아웃 감지**: LayoutParser를 사용한 문단/표/그림 블록 감지
- **목차 자동 추출**: 폰트 크기/스타일 기반 헤딩 감지
- **표 구조화**: Camelot/Tabula를 사용한 표 행/열 파싱
- **읽기순서 복원**: 컬럼 클러스터링 + 캡션 결합
- **TipTap JSON 출력**: 프론트엔드에서 바로 사용 가능한 형식

## 📦 기술 스택

- **FastAPI** - 웹 프레임워크
- **PyMuPDF (fitz)** - PDF 텍스트 레이어 추출
- **LayoutParser** - 딥러닝 기반 레이아웃 감지
- **Camelot/Tabula** - 표 구조화
- **Pillow** - 이미지 처리

## 🚀 설치 및 실행

### 1. 가상환경 생성 및 활성화

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate  # Windows
```

### 2. 의존성 설치

```bash
pip install -r requirements.txt
```

**참고**: LayoutParser 설치 시간이 오래 걸릴 수 있습니다 (detectron2 포함).

### 3. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어서 실제 값 입력
```

### 4. 서비스 실행

```bash
python main.py
```

또는

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

서비스가 `http://localhost:8000`에서 실행됩니다.

## 📡 API 엔드포인트

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "pdf-structure-service",
  "environment": "development"
}
```

### PDF 구조 추출 (TODO: Phase 4.8에서 구현)

```http
POST /api/extract-structure
Content-Type: application/json

{
  "pdfUrl": "https://example.com/document.pdf",
  "options": {
    "extractTables": true,
    "detectHeadings": true
  }
}
```

**Response:**
```json
{
  "tiptapJson": { ... },
  "toc": [ ... ],
  "metadata": { ... }
}
```

## 🐳 Docker 사용

### 이미지 빌드

```bash
docker build -t pdf-structure-service .
```

### 컨테이너 실행

```bash
docker run -p 8000:8000 --env-file .env pdf-structure-service
```

## 📁 프로젝트 구조

```
python-service/
├── main.py                 # FastAPI 앱 엔트리포인트
├── requirements.txt        # Python 의존성
├── Dockerfile             # Docker 이미지 정의
├── .env.example           # 환경 변수 템플릿
├── .gitignore
├── README.md
└── app/
    ├── __init__.py
    ├── services/          # 핵심 비즈니스 로직
    │   ├── __init__.py
    │   ├── pdf_analyzer.py      # PDF 텍스트 레이어 분석
    │   ├── layout_detector.py   # LayoutParser 통합
    │   ├── heading_detector.py  # 목차/헤딩 감지
    │   ├── reading_order.py     # 읽기순서 복원
    │   ├── table_extractor.py   # 표 추출
    │   └── tiptap_converter.py  # TipTap JSON 변환
    ├── routers/           # API 라우터
    │   ├── __init__.py
    │   └── pdf_structure.py     # 구조 추출 엔드포인트
    ├── models/            # Pydantic 모델
    │   ├── __init__.py
    │   ├── request.py           # Request DTO
    │   └── response.py          # Response DTO
    └── utils/             # 유틸리티
        ├── __init__.py
        └── config.py            # 환경 설정
```

## 🔧 개발 진행 상황

### Phase 4.1: 프로젝트 초기화 ✅ (완료)
- [x] 디렉토리 구조 생성
- [x] requirements.txt 작성
- [x] main.py 작성
- [x] config.py 작성
- [x] Dockerfile 작성 (진행 중)

### Phase 4.2~4.7: 핵심 기능 구현 (예정)
- [ ] PDF 텍스트 레이어 분석
- [ ] LayoutParser 통합
- [ ] 목차/헤딩 감지
- [ ] 읽기순서 복원
- [ ] 표 추출
- [ ] TipTap JSON 변환

### Phase 4.8: API 엔드포인트 (예정)
- [ ] POST /api/extract-structure 구현

## 📝 참고 자료

- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [PyMuPDF 문서](https://pymupdf.readthedocs.io/)
- [LayoutParser GitHub](https://github.com/Layout-Parser/layout-parser)
- [Camelot 문서](https://camelot-py.readthedocs.io/)
- [TipTap JSON 스키마](https://tiptap.dev/guide/output-json)