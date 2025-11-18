import os
import httpx
import json
import re
import html
from typing import List
from sqlalchemy.orm import Session
from app.config import GMS_KEY
from app.config import HUGGINGFACE_TOKEN

# --- LCEL 임포트 ---
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from fastapi import HTTPException
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_classic.chains import (
    create_history_aware_retriever,
    create_retrieval_chain,
)
from langchain_classic.chains.combine_documents import create_stuff_documents_chain

# --- Re-ranking 임포트 ---
from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder


# --- 전역 변수 초기화 ---
GMS_BASE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1"
CHROMA_PERSIST_DIRECTORY = "./chroma_db"

# 1. 모델 및 벡터 스토어 클라이언트 초기화
try:
    embedding_model = OpenAIEmbeddings(
        model="text-embedding-3-large", api_key=GMS_KEY, base_url=GMS_BASE_URL
    )
    print("✅ 임베딩 모델 초기화 성공")

    llm = ChatOpenAI(
        temperature=0.7, model_name="gpt-5", api_key=GMS_KEY, base_url=GMS_BASE_URL
    )
    print("✅ LLM 모델 초기화 성공")

    # --- Reranker 모델 초기화 (다중 fallback 전략) ---
    reranker_model = None

    # 시도 1: 한국어 최적화 모델 (토큰 필요)
    if HUGGINGFACE_TOKEN:
        try:
            reranker_model = HuggingFaceCrossEncoder(
                model_name="Dongjin-kr/ko-reranker",
                model_kwargs={
                    'device': 'cpu',
                    'trust_remote_code': True,
                    'token': HUGGINGFACE_TOKEN  # ✅ 수정: use_auth_token -> token
                }
            )
            print("✅ Reranker 모델 초기화 성공 (Dongjin-kr/ko-reranker)")
        except Exception as e:
            print(f"⚠️ 한국어 Reranker 초기화 실패: {e}")

    # 시도 2: 공개 다국어 모델 (토큰 불필요)
    if reranker_model is None:
        try:
            reranker_model = HuggingFaceCrossEncoder(
                model_name="BAAI/bge-reranker-base",
                model_kwargs={'device': 'cpu'}
            )
            print("✅ Reranker 모델 초기화 성공 (BAAI/bge-reranker-base)")
        except Exception as e:
            print(f"⚠️ BAAI Reranker 초기화 실패: {e}")

    # 시도 3: 가장 안정적인 영어 모델 (최종 fallback)
    if reranker_model is None:
        try:
            reranker_model = HuggingFaceCrossEncoder(
                model_name="cross-encoder/ms-marco-MiniLM-L-6-v2",
                model_kwargs={'device': 'cpu'}
            )
            print("✅ Reranker 모델 초기화 성공 (ms-marco-MiniLM-L-6-v2)")
        except Exception as e:
            print(f"❌ 모든 Reranker 초기화 실패: {e}")
            reranker_model = None

except Exception as e:
    print(f"❌ 모델 초기화 실패: {e}")
    embedding_model = None
    llm = None
    reranker_model = None


# --- ID-컬렉션명 변환 헬퍼 함수 ---
def _get_collection_name(document_id: str) -> str:
    """
    document_id를 Chroma 컬렉션명으로 변환
    예: '123abc' -> 'material_123abc'
    """
    if not document_id:
        raise ValueError("Document ID가 비어있습니다.")

    # Chroma 컬렉션명 규칙: 알파벳, 숫자, 언더스코어만 허용, 3-63자
    sanitized_id = re.sub(r"[^a-zA-Z0-9_]", "_", document_id)
    collection_name = f"material_{sanitized_id}"

    if len(collection_name) > 63:
        collection_name = collection_name[:63]

    return collection_name


# --- 워크플로우 1: 임베딩 생성 (Service Logic) ---


async def download_json_from_cloudfront(url: str) -> dict:
    """
    CloudFront/S3 URL에서 JSON 파일을 다운로드합니다.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"CloudFront/S3 JSON 다운로드 실패 (URL: {url}): HTTP {response.status_code}",
                )

            return response.json()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="JSON 다운로드 시간 초과")
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500, detail="다운로드된 파일이 유효한 JSON이 아닙니다."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JSON 다운로드 중 오류: {str(e)}")


def _clean_html_content(html_text: str) -> str:
    """
    HTML 태그를 제거하고 순수 텍스트만 추출합니다.
    """
    if not html_text:
        return ""

    # <br> 태그를 개행 문자로 변환
    text = re.sub(r"<br\s*/?>", "\n", html_text, flags=re.IGNORECASE)

    # 모든 HTML 태그 제거
    text = re.sub(r"<[^>]+>", " ", text)

    # HTML 엔티티 디코딩 (&nbsp; -> 공백 등)
    text = html.unescape(text)

    # 연속된 공백을 하나로 압축
    text = " ".join(text.split())

    return text


def extract_data_from_json(json_data: dict) -> List[Document]:
    """
    JSON 데이터에서 Document 객체 리스트를 추출합니다.
    """
    documents = []
    chapters = json_data.get("chapters", [])

    if not chapters:
        raise ValueError(
            "JSON에서 'chapters' 키를 찾을 수 없거나 리스트가 비어있습니다."
        )

    for chapter in chapters:
        chapter_id = chapter.get("id")
        title = chapter.get("title")
        content_html = chapter.get("content", "")
        chapter_type = chapter.get("type")

        base_metadata = {
            "chapter_id": str(chapter_id),  # 🔧 수정: 문자열로 변환
            "title": title or "제목 없음",  # 🔧 수정: None 방지
            "type": chapter_type,
        }

        # 빈 챕터 스킵
        if "새 챕터의 내용을 입력하세요" in content_html:
            print(f"빈 챕터 건너뜀: {title}")
            continue

        # 타입별 처리
        if chapter_type == "content":
            plain_text = _clean_html_content(content_html)
            if plain_text.strip():
                documents.append(
                    Document(page_content=plain_text, metadata=base_metadata)
                )

        elif chapter_type == "quiz":
            qa_list = chapter.get("qa", [])
            for idx, qa_pair in enumerate(qa_list):  # 🔧 수정: 인덱스 추가
                q = qa_pair.get("question", "")
                a = qa_pair.get("answer", "")

                if not q or not a:  # 🔧 수정: 빈 Q&A 스킵
                    continue

                qa_content = f"질문: {q}\n정답: {a}"

                # 🔧 수정: Q&A 메타데이터에 인덱스 추가
                qa_metadata = base_metadata.copy()
                qa_metadata["qa_index"] = idx

                documents.append(
                    Document(page_content=qa_content, metadata=qa_metadata)
                )

    print(f"JSON 파싱 완료. 총 {len(documents)}개의 Document 생성.")
    return documents


def create_and_store_embeddings(document_id: str, documents: List[Document]):
    """
    Document 리스트를 청크로 분할하고 임베딩을 생성하여 Chroma DB에 저장합니다.
    """
    if not documents:
        raise ValueError("임베딩할 Document가 없습니다.")

    if not embedding_model:
        raise ValueError("임베딩 모델이 초기화되지 않았습니다.")

    # 🔧 수정: 타입별 청크 크기 최적화
    content_chunks = []
    quiz_chunks = []

    for doc in documents:
        if doc.metadata.get("type") == "quiz":
            # 퀴즈는 분할하지 않고 그대로 유지
            quiz_chunks.append(doc)
        else:
            # 일반 콘텐츠만 분할
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000, chunk_overlap=100
            )
            content_chunks.extend(text_splitter.split_documents([doc]))

    all_chunks = content_chunks + quiz_chunks

    if not all_chunks:
        print("⚠️ 경고: 텍스트 분할 후 청크가 없습니다.")
        return

    collection_name = _get_collection_name(document_id)
    print(
        f"텍스트 분할 완료. 총 {len(all_chunks)}개의 청크 생성 "
        f"(콘텐츠: {len(content_chunks)}, 퀴즈: {len(quiz_chunks)}). "
        f"컬렉션: {collection_name}"
    )

    # 🔧 수정: 기존 컬렉션이 있으면 삭제 후 재생성 (선택적)
    try:
        existing_vectorstore = Chroma(
            persist_directory=CHROMA_PERSIST_DIRECTORY,
            embedding_function=embedding_model,
            collection_name=collection_name,
        )
        # 기존 컬렉션 삭제
        existing_vectorstore.delete_collection()
        print(f"기존 컬렉션 '{collection_name}' 삭제됨")
    except Exception:
        pass  # 컬렉션이 없으면 무시

    # Chroma DB에 저장
    vector_store = Chroma.from_documents(
        documents=all_chunks,
        embedding=embedding_model,
        collection_name=collection_name,
        persist_directory=CHROMA_PERSIST_DIRECTORY,
    )

    print(f"✅ '{document_id}' (컬렉션: {collection_name}) 임베딩 및 저장 완료.")


# --- 워크플로우 2: RAG 질의응답 (Re-ranking 적용) ---


def get_rag_chain(document_id: str):
    """
    Re-ranking이 적용된 LCEL 체인을 생성합니다.

    동작 흐름:
    1. Base Retriever로 10개 문서 검색 (MMR 방식)
    2. Reranker로 상위 3개 재정렬
    3. History-Aware Retriever로 질문 재구성
    4. 최종 답변 생성
    """
    # 모델 초기화 체크
    if not embedding_model or not llm:
        raise ValueError("LLM 또는 임베딩 모델이 초기화되지 않았습니다.")

    collection_name = _get_collection_name(document_id)

    # 🔧 수정: 컬렉션 존재 여부 확인
    try:
        vectorstore = Chroma(
            persist_directory=CHROMA_PERSIST_DIRECTORY,
            embedding_function=embedding_model,
            collection_name=collection_name,
        )
        # 테스트 쿼리로 컬렉션 존재 확인
        vectorstore.similarity_search("test", k=1)
    except Exception as e:
        raise ValueError(f"'{document_id}' 컬렉션을 찾을 수 없습니다: {e}")

    # 1단계: Base Retriever (넓은 검색)
    base_retriever = vectorstore.as_retriever(
        search_type="mmr",  # Maximum Marginal Relevance (다양성 보장)
        search_kwargs={
            "k": 10,  # 초기 검색: 10개
            "fetch_k": 20,  # 🔧 수정: MMR 후보 풀 확대
        },
    )

    # 2단계: Reranker 적용 (선택적)
    if reranker_model:
        print(f"✅ Reranker 적용: 10개 → 상위 3개 재정렬")

        compressor = CrossEncoderReranker(
            model=reranker_model, top_n=3  # 최종 3개만 선택
        )

        final_retriever = ContextualCompressionRetriever(
            base_compressor=compressor, base_retriever=base_retriever
        )
    else:
        print(f"⚠️ Reranker 미적용: Base Retriever만 사용 (k=5로 조정)")
        # Reranker 없을 경우 검색 수 조정
        final_retriever = vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": 5,  # Reranker 없으면 5개만 검색
                "fetch_k": 15,  # 🔧 수정: fetch_k 추가
            },
        )

    # 3단계: 질문 재구성 프롬프트 (대화 맥락 반영)
    rephrase_prompt = ChatPromptTemplate.from_messages(
        [
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            (
                "user",
                "이전 대화 내용을 참고하여, 위 질문을 검색하기 좋은 독립적인 질문으로 다시 작성해주세요. "
                "질문만 작성하고 다른 설명은 하지 마세요.",  # 🔧 수정: 명확한 지시
            ),
        ]
    )

    # 4단계: History-Aware Retriever
    history_aware_retriever = create_history_aware_retriever(
        llm=llm, retriever=final_retriever, prompt=rephrase_prompt
    )

    # 5단계: 답변 생성 프롬프트 (TTS 최적화)
    answer_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """당신은 학생의 질문에 답변하는 친절하고 전문적인 AI 교사입니다.
                [!!중요 규칙!!]
                1. 학생은 이 답변을 모바일에서 **음성(TTS)으로 듣습니다.**
                2. 따라서, 답변은 **반드시 1~2문장의 간결하고 명확한 핵심 요약**으로 제공해야 합니다.
                3. 절대 길게 설명하지 마세요. 학생이 듣기에 불편합니다.
                
                [답변 생성 규칙]
                1. 오직 아래에 제공되는 [문서 내용]만을 근거로 답변해야 합니다.
                2. 근거를 찾을 수 없으면 "자료에 해당 내용이 없습니다"라고만 답변하세요.
                3. 답변에는 출처를 포함하지 마세요. (TTS로 듣기 때문)
                
                [문서 내용]:
                {context}""",
            ),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
        ]
    )

    # 6단계: Document Chain
    document_chain = create_stuff_documents_chain(llm, answer_prompt)

    # 7단계: 최종 Retrieval Chain
    conversational_retrieval_chain = create_retrieval_chain(
        history_aware_retriever, document_chain
    )

    return conversational_retrieval_chain
