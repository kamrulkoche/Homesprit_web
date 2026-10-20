# Homesprit Backend

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1     PYTHONDONTWRITEBYTECODE=1     PIP_NO_CACHE_DIR=1     PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# libpq for psycopg2-binary's runtime; curl for the healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends     libpq5     curl     && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

RUN mkdir -p logs

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3     CMD curl -f http://localhost:8001/health || exit 1

# Migrations are a RELEASE step, not a startup step — the app verifies the
# schema revision and refuses to boot if it is behind. docker-compose.yml runs
# `alembic upgrade head` before this.
CMD ["uvicorn", "src.api.app:app", "--host", "0.0.0.0", "--port", "8001"]
