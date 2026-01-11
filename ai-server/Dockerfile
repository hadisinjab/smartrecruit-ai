# AI Server Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies in stages
COPY ai-server/requirements.txt .

# Install numpy and cython first (needed by other packages)
RUN pip install --no-cache-dir numpy cython

# Install the rest of the requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy AI server files
COPY ai-server/ ./

EXPOSE 10000

CMD gunicorn --bind 0.0.0.0:10000 server:app