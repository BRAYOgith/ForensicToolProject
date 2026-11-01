# Use Python slim bookworm base (Debian 12 Bookworm - active LTS release)
FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies for WeasyPrint (Cairo, Pango, GDK-Pixbuf) and crypto
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        wget \
        curl \
        libgl1 \
        libglib2.0-0 \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        shared-mime-info \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY . .

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose ports (Render uses 10000 by default, local dev uses 5000)
EXPOSE 10000
EXPOSE 5000

# Run gunicorn bound dynamically to Render's $PORT (defaults to 10000 on Render, 5000 locally)
CMD ["sh", "-c", "exec gunicorn -w 1 --threads 4 -b 0.0.0.0:${PORT:-10000} --timeout 120 --keep-alive 5 api:app"]
