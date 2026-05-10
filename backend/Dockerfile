# ── Backend Dockerfile ──
FROM python:3.11-slim

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App source
COPY server.py .

# Uploads directory (will be a persistent volume)
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Run
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
