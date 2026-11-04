# ==============================================================================
# Multi-stage Dockerfile for CV Tailor Backend (FastAPI + Typst Engine)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS builder

# Copy official standalone uv binary
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Copy dependency specifications for layer caching
COPY pyproject.toml uv.lock ./
COPY back/engine/pyproject.toml ./back/engine/pyproject.toml

# Install dependencies into virtualenv without building package source yet
RUN uv sync --frozen --no-install-project --no-dev

# Copy application and vendored assets (engine, templates, fonts)
COPY back ./back
COPY README.md LICENSE ./

# Sync project package in non-editable mode
RUN uv sync --frozen --no-dev

# ------------------------------------------------------------------------------
# Stage 2: Runtime
# ------------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS runner

WORKDIR /app

# Create non-root user for security
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/sh -m appuser

# Copy virtualenv and codebase from builder
COPY --from=builder --chown=appuser:appgroup /app/.venv /app/.venv
COPY --from=builder --chown=appuser:appgroup /app/back /app/back

# Environment settings
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app" \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Default exposed port (overridden at runtime by $PORT on cloud platforms)
EXPOSE 8000

USER appuser

# Dynamic bind to 0.0.0.0 and variable $PORT (Railway, Render, Fly.io, Cloud Run, VPS)
CMD ["sh", "-c", "exec uvicorn back.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
