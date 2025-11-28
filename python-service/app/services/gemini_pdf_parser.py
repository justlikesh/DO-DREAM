"""
Gemini API를 사용한 PDF 파싱 서비스

Google Gemini 2.5 모델을 사용하여 PDF 문서를 구조화된 JSON으로 변환합니다.
교육 자료의 계층적 구조(index, title, s_title, ss_title)를 자동으로 추출합니다.
"""

import google.generativeai as genai
from typing import Dict, Any, Optional
import json
import logging

from app.utils.config import settings

logger = logging.getLogger(__name__)


class GeminiPDFParser:
    """PDF를 Gemini로 파싱하는 클래스"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Gemini API 초기화

        Args:
            api_key: Gemini API 키 (None인 경우 설정에서 로드)

        Raises:
            ValueError: API 키가 설정되지 않은 경우
        """
        self.api_key = api_key or settings.GEMINI_API_KEY

        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY가 설정되지 않았습니다. "
                ".env 파일에 GEMINI_API_KEY를 추가하거나 환경변수로 설정하세요."
            )

        # Gemini API 구성
        genai.configure(api_key=self.api_key)

        # Gemini 2.5 Flash 사용 (빠르고 효율적)
        # 또는 models/gemini-2.5-pro (더 강력하지만 느림)
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')

        logger.info("Gemini PDF Parser 초기화 완료 (모델: gemini-2.5-flash)")

    def parse_pdf(
        self,
        pdf_path: str,
        output_format: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        PDF를 파싱하여 지정된 형식으로 반환

        Args:
            pdf_path: PDF 파일 경로
            output_format: 출력 JSON 형식 (None인 경우 기본 형식 사용)

        Returns:
            파싱된 JSON 데이터

        Raises:
            ValueError: JSON 파싱 실패 또는 PDF 처리 중 오류
        """
        # 기본 출력 형식
        if output_format is None:
            output_format = self._get_default_output_format()

        # PDF 파일 업로드
        logger.info(f"PDF 파일 업로드 중: {pdf_path}")
        uploaded_file = genai.upload_file(pdf_path)
        logger.info(f"업로드 완료: {uploaded_file.name}")

        # 프롬프트 생성
        prompt = self._create_parsing_prompt(output_format)

        try:
            logger.info("Gemini로 PDF 분석 중...")
            response = self.model.generate_content([uploaded_file, prompt])

            # 업로드된 파일 삭제
            genai.delete_file(uploaded_file.name)
            logger.info("임시 파일 삭제 완료")

            response_text = response.text.strip()

            # 마크다운 코드 블록 제거
            response_text = response_text.replace('```json', '').replace('```', '').strip()

            # JSON 파싱
            parsed_data = json.loads(response_text)
            logger.info("JSON 파싱 성공!")

            return parsed_data

        except json.JSONDecodeError as e:
            # JSON 파싱 실패시 원본 응답 출력
            logger.error(f"JSON 파싱 실패: {e}")
            logger.error(f"응답 내용:\n{response_text[:500]}...")
            raise ValueError(
                f"JSON 파싱 실패: {e}\n응답: {response_text[:500]}..."
            )

        except Exception as e:
            # 업로드된 파일 삭제 (에러 발생시에도)
            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass

            logger.error(f"PDF 파싱 중 오류 발생: {e}", exc_info=True)
            raise ValueError(f"PDF 파싱 중 오류 발생: {e}")

    def _get_default_output_format(self) -> str:
        """기본 출력 형식 반환"""
        return """
{
    "indexes": ["목차1", "목차2", ...],
    "data": [
        {
            "index": "01",
            "index_title": "챕터 제목",
            "titles": [
                {
                    "title": "섹션 제목",
                    "s_titles": [
                        {
                            "s_title": "소제목",
                            "contents": "내용",
                            "ss_titles": [
                                {
                                    "ss_title": "하위 소제목",
                                    "contents": "내용"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}
"""

    def _create_parsing_prompt(self, output_format: str) -> str:
        """PDF 파싱용 프롬프트 생성"""
        return f"""
다음 PDF 문서를 분석하여 아래의 JSON 형식으로 정확하게 변환해주세요.

**중요한 규칙:**
1. 응답은 반드시 유효한 JSON 형식이어야 합니다.
2. JSON 외의 다른 텍스트는 절대 포함하지 마세요.
3. 마크다운 코드 블록(```)을 사용하지 마세요.
4. 문서의 구조를 정확하게 파악하여 계층적으로 표현해주세요.
5. 다음 유형의 내용은 추출 대상에서 제외하고, 나머지 본문 내용과 **'개념 플러스'** 내용을 포함합니다:
   - **'개념 Check'** 등의 별도 박스나 강조 표시된 **보조 설명 중 '개념 플러스'를 제외한 항목**.
   - **'사회적 희소가치', '상징', '상황 정의'** 등 본문 외곽에 위치한 **용어 정의** 박스.
   - **'개념 플러스'는 반드시 추출에 포함**하며, 이를 **s_title** 또는 **ss_title** 중 적절한 계층에 넣어주세요.
6. **'contents' 필드에 여러 항목이 나열될 경우, 슬래시(/)를 구분자로 사용하지 마세요.**
7. **'contents' 필드의 여러 문장이나 목록 항목은 텍스트 내에서 반드시 불릿 포인트(•)와 줄 바꿈(\n)을 사용하여 원본 문서와 같이 목록 형태로 표현해주세요. 각 항목은 독립된 줄에 위치해야 합니다.** (예: "• 첫 번째 항목\n• 두 번째 항목")
8. 모든 텍스트 내용을 빠짐없이 포함해주세요. (단, 5번 규칙에 따라 제외될 내용은 제외합니다.)

**출력 형식:**
{output_format}

위 형식을 정확히 따라 JSON만 출력해주세요.
"""

    def parse_pdf_with_custom_prompt(
        self,
        pdf_path: str,
        custom_prompt: str
    ) -> Dict[str, Any]:
        """
        사용자 정의 프롬프트로 PDF 파싱

        Args:
            pdf_path: PDF 파일 경로
            custom_prompt: 사용자 정의 프롬프트

        Returns:
            파싱된 JSON 데이터
        """
        # PDF 파일 업로드
        logger.info(f"PDF 파일 업로드 중: {pdf_path}")
        uploaded_file = genai.upload_file(pdf_path)
        logger.info(f"업로드 완료: {uploaded_file.name}")

        try:
            logger.info("Gemini로 PDF 분석 중 (사용자 정의 프롬프트)...")
            response = self.model.generate_content([uploaded_file, custom_prompt])

            # 업로드된 파일 삭제
            genai.delete_file(uploaded_file.name)
            logger.info("임시 파일 삭제 완료")

            response_text = response.text.strip()

            # 마크다운 코드 블록 제거
            response_text = response_text.replace('```json', '').replace('```', '').strip()

            # JSON 파싱 시도
            try:
                parsed_data = json.loads(response_text)
                logger.info("JSON 파싱 성공!")
                return parsed_data
            except json.JSONDecodeError:
                # JSON이 아닌 경우 텍스트 응답 그대로 반환
                logger.warning("응답이 JSON 형식이 아님, 텍스트로 반환")
                return {"response": response_text}

        except Exception as e:
            # 업로드된 파일 삭제 (에러 발생시에도)
            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass

            logger.error(f"PDF 파싱 중 오류 발생: {e}", exc_info=True)
            raise ValueError(f"PDF 파싱 중 오류 발생: {e}")


# 편의 함수
def parse_pdf_with_gemini(
    pdf_path: str,
    output_format: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    PDF를 Gemini로 파싱 (편의 함수)

    Args:
        pdf_path: PDF 파일 경로
        output_format: 출력 JSON 형식
        api_key: Gemini API 키

    Returns:
        파싱된 JSON 데이터
    """
    parser = GeminiPDFParser(api_key=api_key)
    return parser.parse_pdf(pdf_path, output_format)


# 테스트용 메인
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("사용법: python gemini_pdf_parser.py <pdf_file_path>")
        sys.exit(1)

    pdf_file = sys.argv[1]

    # 로깅 설정
    logging.basicConfig(level=logging.INFO)

    # PDF 파싱
    try:
        parsed_data = parse_pdf_with_gemini(pdf_file)

        # 결과 출력
        print("\n" + "="*60)
        print("PDF 파싱 결과 (Gemini)")
        print("="*60 + "\n")
        print(json.dumps(parsed_data, indent=2, ensure_ascii=False))

    except Exception as e:
        print(f"오류 발생: {e}")
        sys.exit(1)
