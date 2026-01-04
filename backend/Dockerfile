# ---------- Builder ----------
    FROM python:3.12-slim AS builder

    WORKDIR /app
    
    RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*
    
    COPY requirements.txt .
    RUN pip install --no-cache-dir --upgrade pip && \
        pip install --no-cache-dir -r requirements.txt
    
    # ---------- Runtime ----------
    FROM python:3.12-slim
    
    ENV PYTHONDONTWRITEBYTECODE=1
    ENV PYTHONUNBUFFERED=1
    
    WORKDIR /app
    
    RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*
    
    COPY --from=builder /usr/local /usr/local
    COPY . .
    
    EXPOSE 8000
    
    CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
    