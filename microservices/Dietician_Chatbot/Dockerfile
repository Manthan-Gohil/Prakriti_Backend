# ───────────────────────────────────────────────
# Dockerfile for Dietician Chatbot (FastAPI)
# Optimized: CPU-only PyTorch (~200MB vs ~4.4GB)
# ───────────────────────────────────────────────
FROM python:3.13-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed by faiss-cpu, scipy, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ── 1. Install CPU-only PyTorch FIRST (saves ~4GB) ──
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# ── 2. Install remaining Python dependencies ──
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── 3. Pre-download the sentence-transformer model during build ──
#    so it doesn't download at runtime (faster cold starts)
ENV HF_HOME=/app/.hf_cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# ── 4. Copy application source code ──
COPY . .

# Expose port (Render injects PORT env var)
EXPOSE 8000

# Start the FastAPI server
CMD ["python", "app.py"]
