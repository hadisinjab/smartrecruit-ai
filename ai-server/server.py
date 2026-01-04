"""Flask server for AI module with health check and error handlers."""
from __future__ import annotations

import os
from typing import Any, Dict, Optional

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import time
import tempfile
import os
import mimetypes

from modules.utils import LOGGER, validate_api_key, audio_duration_seconds
from modules.transcribe import transcribe_audio
from modules.refine import refine_with_ollama


def _load_env() -> None:
    """
    Load environment variables from ai-server/.env or project root .env
    """
    here = os.path.dirname(os.path.abspath(__file__))
    backend_env = os.path.join(here, ".env")
    root_env = os.path.join(os.getcwd(), ".env")
    if os.path.exists(backend_env):
        load_dotenv(backend_env)
    elif os.path.exists(root_env):
        load_dotenv(root_env)
    else:
        load_dotenv()


_load_env()

app = Flask(__name__)
CORS(app, origins=os.getenv("CORS_ORIGIN", "*"))


@app.before_request
def _check_api_key() -> None:
    """
    Enforce API key for all routes except health.
    """
    if request.path == "/health":
        return None
    if not validate_api_key(request.headers):
        return jsonify({"error": True, "message": "Unauthorized"}), 401
    return None


@app.get("/health")
def health() -> Any:
    """
    Basic health check route.
    """
    return jsonify({
        "status": "ok",
        "service": "ai-server",
        "env": os.getenv("FLASK_ENV", "development"),
    })


@app.errorhandler(404)
def err_404(e) -> Any:
    return jsonify({"error": True, "message": "Not found", "path": getattr(request, 'path', None)}), 404


@app.errorhandler(500)
def err_500(e) -> Any:
    LOGGER.error(f"Server error: {e}")
    return jsonify({"error": True, "message": "Internal server error"}), 500


@app.post("/api/transcribe")
def api_transcribe() -> Any:
    """
    Accept an audio file, run transcription and refinement, and return JSON.
    """
    backend_key = os.getenv("BACKEND_API_KEY")
    if not backend_key:
        return jsonify({"error": True, "message": "Server configuration error"}), 500

    file = request.files.get("audio")
    if not file:
        return jsonify({"error": True, "message": "No audio file provided"}), 400

    # Validate size
    max_size = int(os.getenv("MAX_AUDIO_SIZE", str(50 * 1024 * 1024)))
    file.stream.seek(0, 2)  # move to end
    size = file.stream.tell()
    file.stream.seek(0)
    if size > max_size:
        return jsonify({"error": True, "message": "Audio file too large"}), 413

    # Validate mimetype/extension
    ctype = file.mimetype or mimetypes.guess_type(file.filename)[0] or ""
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_ext = {".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".webm"}
    if not (ctype.startswith("audio/") or ext in allowed_ext):
        return jsonify({"error": True, "message": "Invalid audio file type"}), 415

    # Save to temp uploads
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    suffix = os.path.splitext(file.filename)[1] or ".wav"
    temp_fd, temp_path = tempfile.mkstemp(suffix=suffix, dir=uploads_dir)
    os.close(temp_fd)
    file.save(temp_path)

    start = time.time()
    try:
        result = transcribe_audio(temp_path)
        raw = result.get("raw_transcript", "")
        segments = result.get("segments", [])
        metadata = result.get("metadata", {})
        clean = refine_with_ollama(raw)
        processing_time = round(time.time() - start, 3)
        # metadata enrichment
        metadata["processing_time"] = processing_time
        metadata["language"] = metadata.get("language") or os.getenv("TRANSCRIBE_LANGUAGE", "ar")
        metadata["model"] = metadata.get("model") or f"faster-whisper:{os.getenv('WHISPER_MODEL','medium')}"
        # duration
        duration = audio_duration_seconds(temp_path)
        response = {
            "success": True,
            "raw_transcript": raw,
            "clean_transcript": clean,
            "segments": segments,
            "metadata": {
                **metadata,
                "duration": duration,
            },
        }
        return jsonify(response)
    except Exception as e:
        LOGGER.error(f"Transcription endpoint error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if os.getenv("DELETE_INPUT_FILES", "true").lower() == "true":
            try:
                os.remove(temp_path)
            except Exception as re:
                LOGGER.warning(f"Failed to remove temp file: {re}")


def run() -> None:
    """
    Run the Flask app using env PORT.
    """
    port = int(os.getenv("PORT", "5001"))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)


if __name__ == "__main__":
    run()
