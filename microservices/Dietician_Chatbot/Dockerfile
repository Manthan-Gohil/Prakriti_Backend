# ───────────────────────────────────────────────
# Dockerfile for Dietician Chatbot (FastAPI)
# ───────────────────────────────────────────────
FROM python:3.13-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed by faiss-cpu, scipy, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all chatbot source files
COPY . .

# Expose port (Render injects PORT env var)
EXPOSE 8000

# Start the FastAPI server
CMD ["python", "app.py"]
