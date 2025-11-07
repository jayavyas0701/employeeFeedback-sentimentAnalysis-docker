# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

# System deps (optional but good for psycopg2 performance)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY worker/app.py .

CMD ["python", "app.py"]
