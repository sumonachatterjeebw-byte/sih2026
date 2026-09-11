# Multi-stage build for POLAR-NAV AI
# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + unified serving
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code, data, models
COPY src/ ./src/
COPY data/ ./data/
COPY models/ ./models/

# Copy built frontend into dist directory
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

# Run uvicorn on $PORT (defaults to 8000)
CMD ["sh", "-c", "python -m uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
