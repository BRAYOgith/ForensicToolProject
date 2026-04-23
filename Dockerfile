# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required by your libraries
# - weasyprint needs libpango, libffi
# - pdfkit needs wkhtmltopdf
# - easyocr and torch need libgl1, libglib
RUN apt-get update && apt-get install -y \
    build-essential \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libffi-dev \
    wkhtmltopdf \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install Python dependencies
# (Using --no-cache-dir keeps the final image smaller)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port (Render sets its own PORT environment variable)
EXPOSE 5000

# Run gunicorn to serve the Flask app
# Gunicorn is much better for production than the default Flask server
CMD ["sh", "-c", "gunicorn -w 2 -b 0.0.0.0:${PORT:-5000} api:app"]
