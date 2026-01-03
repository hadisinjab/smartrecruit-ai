#!/usr/bin/env bash

set -euo pipefail

API_URL="${API_URL:-http://localhost:5002/api/transcription/voice}"
API_KEY="${API_KEY:-your-secure-key-here}"
AUDIO_FILE="${1:-sample.wav}"
APP_ID="${APP_ID:-app_123}"
QUESTION_ID="${QUESTION_ID:-q_001}"

if [[ ! -f "$AUDIO_FILE" ]]; then
  echo "Audio file not found: $AUDIO_FILE"
  exit 1
fi

curl -s -X POST "$API_URL" \
  -H "x-api-key: $API_KEY" \
  -F "audio=@${AUDIO_FILE}" \
  -F "application_id=${APP_ID}" \
  -F "question_id=${QUESTION_ID}" | jq .

