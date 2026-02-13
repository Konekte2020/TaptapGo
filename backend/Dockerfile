# Backend TapTapGo - image pour déploiement (Railway, Render, Fly.io, etc.)
FROM python:3.11-slim

WORKDIR /app

# Dépendances système éventuelles (optionnel)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Port exposé (uvicorn)
EXPOSE 8000

# Health check (optionnel, utilisé par certains hébergeurs)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=2 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
