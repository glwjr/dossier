FROM python:3.12-slim

WORKDIR /app

RUN pip install uv --quiet

ENV UV_PROJECT_ENVIRONMENT=/usr/local

# Install pinned dependencies first (no project code yet) so this layer is
# cached across source-only changes. --frozen fails if uv.lock is stale.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Now install the project itself against the copied source.
COPY . .
RUN uv sync --frozen --no-dev

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python seed.py --demo && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
