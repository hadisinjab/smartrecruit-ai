# AI Server (Flask)

## Requirements
- Python 3.10+
- Create environment file `ai-server/.env` (copy from `.env.example`)

## Setup
1. Create a virtual environment and install dependencies:
   ```bash
   cd ai-server
   python -m venv .venv
   # Windows:
   .venv\\Scripts\\activate
   # macOS/Linux:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   # Then edit values according to your environment
   ```

## Run
```bash
python server.py
```

## Endpoints
- `GET /health` health check
- All other routes require API key via header `x-api-key` or `Authorization: Bearer <key>`.

### Voice Transcription
- `POST /api/transcribe`
  - Fields:
    - `audio` file (multipart/form-data)
  - Response:
    ```json
    {
      "success": true,
      "raw_transcript": "...",
      "clean_transcript": "...",
      "segments": [
        { "start": 0.0, "end": 2.5, "text": "..." }
      ],
      "metadata": {
        "duration": 120.5,
        "language": "ar",
        "model": "medium",
        "processing_time": 15.2
      }
    }
    ```

## Notes
- If using Ollama locally, ensure it's running and set `OLLAMA_HOST` and `OLLAMA_MODEL` in environment.
- Ensure FFmpeg is installed for audio processing.
- faster-whisper may require suitable models and environment; CUDA/ONNXRuntime improves performance.
