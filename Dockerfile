# ───────────────────────────────────────────────
# Dockerfile for Prakriti AI (Node.js + Python)
# Multi-stage: installs Python for trained_model
# ───────────────────────────────────────────────
FROM node:20-slim

# Install Python 3 for the dosha prediction scripts
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (layer caching)
COPY package*.json ./

# Install Node dependencies
RUN npm ci --omit=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Install Python dependencies for trained_model
COPY trained_model/requirements.txt ./trained_model/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r trained_model/requirements.txt

# Copy the rest of the application
COPY . .

# Create upload directories
RUN mkdir -p uploads/assessment uploads/food uploads/profile

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
