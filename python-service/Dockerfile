# ✅ Python 3.9 slim으로 변경
FROM python:3.9-slim

WORKDIR /app

# 1. 시스템 종속성 설치 (변경 없음)
RUN apt-get update && apt-get install -y \
    git g++ gcc make ghostscript poppler-utils libgl1 libglib2.0-0 \
    build-essential ninja-build \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# 2. pip 업데이트 (변경 없음)
RUN pip install --no-cache-dir --upgrade pip

# 3. PyTorch (CPU 전용) 설치 (변경 없음)
RUN pip install --no-cache-dir torch==2.0.1+cpu torchvision==0.15.2+cpu --index-url https://download.pytorch.org/whl/cpu

# 4. requirements.txt 설치 (변경 없음)
RUN pip install --no-cache-dir -r requirements.txt

# 5. detectron2 설치 (⭐ 빌드 격리 해제 플래그 추가!)
RUN pip install --no-cache-dir 'git+https://github.com/facebookresearch/detectron2.git@v0.6' --no-build-isolation

COPY . .

RUN mkdir -p /tmp/pdf-processing

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]