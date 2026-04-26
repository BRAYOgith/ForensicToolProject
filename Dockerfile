# Use Python slim base
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PDF generation and OCR
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        wget \
        libgl1 \
        libglib2.0-0 \
        libpango1.0-0 \
        libpangoft2-1.0-0 \
        libffi-dev \
        wkhtmltopdf \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt || pip install -r requirements.txt || true

# Copy all application code
COPY . .

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Run gunicorn with production settings
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "--keep-alive", "5", "api:app"]
