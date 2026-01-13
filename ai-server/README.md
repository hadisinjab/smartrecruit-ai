---
title: SmartRecruit AI
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 5002
pinned: false
---

# SmartRecruit AI Server

This is the backend AI server for SmartRecruit, powered by Flask and Hugging Face Inference API.

## Endpoints
- `GET /health` - Health check
- `GET /api/debug-hf` - Debug Hugging Face connectivity
- `POST /api/transcribe` - Transcribe audio files
- `POST /api/analyze-cv` - Analyze resumes
- `POST /api/analyze-job` - Analyze job descriptions
- `POST /api/analyze-question` - Analyze interview questions
- `POST /api/comprehensive-analysis` - Full analysis pipeline

## Configuration
Requires `HUGGINGFACE_API_TOKEN` and `BACKEND_API_KEY` secrets.
