# Use Python slim base
FROM python:3.11-slim

WORKDIR /app

# Minimal system deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python deps ignoring torch errors (will use HF API instead)
RUN pip install --no-cache-dir -r requirements.txt || true

# Copy app code
COPY . .

# Expose port
EXPOSE 5000

# Run gunicorn - uses HuggingFace API for AI (not local model)
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "api:app"]