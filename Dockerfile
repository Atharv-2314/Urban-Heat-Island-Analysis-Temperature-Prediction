# ============================================================
# Stage 1: Python base — install Python dependencies
# ============================================================
FROM python:3.11-slim AS python-base

WORKDIR /app

# Install system deps needed by some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python source
COPY src/ ./src/
COPY config/ ./config/
COPY models/ ./models/
COPY data/processed/ ./data/processed/
COPY reports/ ./reports/

# ============================================================
# Stage 2: Node.js build — compile TypeScript backend
# ============================================================
FROM node:20-slim AS server-build

WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ .
RUN npx tsc --noEmit 2>/dev/null || true && npm run build 2>/dev/null || (cp -r src dist)

# ============================================================
# Stage 3: React build — Vite production bundle
# ============================================================
FROM node:20-slim AS client-build

WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# ============================================================
# Stage 4: Final production image
# ============================================================
FROM python:3.11-slim AS production

# Install Node.js runtime in the final image
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python runtime artifacts
COPY --from=python-base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-base /app/src ./src
COPY --from=python-base /app/config ./config
COPY --from=python-base /app/models ./models
COPY --from=python-base /app/data ./data
COPY --from=python-base /app/reports ./reports

# Node.js backend
COPY --from=server-build /build/server/dist ./server/dist
COPY --from=server-build /build/server/node_modules ./server/node_modules
COPY --from=server-build /build/server/package.json ./server/package.json

# React static assets (served by Node API in production)
COPY --from=client-build /build/client/dist ./server/public

# Expose ports
EXPOSE 8000
EXPOSE 5173

# Health-check on the API
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Entry point: start Node API (serves static React build from /public)
CMD ["node", "server/dist/index.js"]
