# AI Server Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY ai-server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy AI server files
COPY ai-server/ ./

EXPOSE 5001

CMD ["python", "server.py"]