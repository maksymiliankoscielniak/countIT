 FROM python:3.11-slim
 
 WORKDIR /app
 
 # System deps for psycopg and security updates
 RUN apt-get update && apt-get install -y --no-install-recommends \
   curl \
   && rm -rf /var/lib/apt/lists/*
 
 # Install uv (fast Python package manager)
 RUN pip install --no-cache-dir uv
 
 COPY pyproject.toml /app/pyproject.toml
 
 # Install deps (no venv in container)
 RUN uv pip compile pyproject.toml -o requirements.txt && uv pip install --system -r requirements.txt
 
 COPY app /app/app
 COPY alembic /app/alembic
 COPY alembic.ini /app/alembic.ini
 COPY start.sh /app/start.sh
 
 ENV PYTHONUNBUFFERED=1
 
 EXPOSE 8000
 
 CMD ["bash", "start.sh"]
 
