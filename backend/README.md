# Backend (Node.js/Express)

## Requirements
- Node.js 18+
- Environment file `backend/.env` (copy from `.env.example`)

## Setup
1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   # Then edit values according to your environment
   ```

## Run
- Start the server:
  ```bash
  node server.js
  # or:
  npm run dev
  ```

## Endpoints
- Health check:
  - `GET /api/health`
- AI server upstream health:
  - `GET /api/external/health/ai` (requires header `x-api-key`)
- Resume file validation:
  - `POST /api/resume/validate` with `file` field
- Voice transcription:
  - `POST /api/transcription/voice` (requires header `x-api-key`)
    - Fields:
      - `audio` file (multipart/form-data)
      - `application_id` string
      - `question_id` string
    - Response:
      ```json
      {
        "success": true,
        "transcription_id": "...",
        "audio_url": "...",
        "raw_transcript": "...",
        "clean_transcript": "...",
        "processing_time": 15.2
      }
      ```
    - Storage bucket:
      - Set `SUPABASE_AUDIO_BUCKET` to your bucket name (e.g. `voice`)

## Security Notes
- Set `BACKEND_API_KEY` and ensure it is sent via header `x-api-key` or `Authorization: Bearer <key>`.
- Never store or log secrets.

## Quick Test
```bash
# From inside backend directory:
./test_transcription.sh path/to/audio.wav
```
