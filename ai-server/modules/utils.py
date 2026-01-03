"""Utilities for AI server: normalization, API key validation, and logging setup."""
from __future__ import annotations

import logging
import os
from typing import Optional
import subprocess


def setup_logger() -> logging.Logger:
    """
    Configure and return a module-level logger.
    """
    logger = logging.getLogger("ai_server")
    if not logger.handlers:
        level = logging.DEBUG if (os.getenv("FLASK_ENV") == "development") else logging.INFO
        logger.setLevel(level)
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


LOGGER = setup_logger()


def normalize_text(text: str) -> str:
    """
    Normalize whitespace in text and strip leading/trailing spaces.
    """
    if not isinstance(text, str):
        return ""
    return " ".join(text.split()).strip()


def extract_api_key_from_headers(headers: dict) -> Optional[str]:
    """
    Extract API key from common header locations.
    """
    if not headers:
        return None
    # x-api-key header
    key = headers.get("X-API-Key") or headers.get("x-api-key")
    if key:
        return key
    # Authorization: Bearer <key>
    auth = headers.get("Authorization") or headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth[7:]
    return None


def validate_api_key(headers: dict) -> bool:
    """
    Validate incoming API key against BACKEND_API_KEY environment variable.
    """
    expected = os.getenv("BACKEND_API_KEY")
    incoming = extract_api_key_from_headers(headers)
    if not expected:
        LOGGER.error("BACKEND_API_KEY is not set")
        return False
    return bool(incoming and incoming == expected)


def audio_duration_seconds(file_path: str) -> Optional[float]:
    """
    Try to obtain audio duration using ffprobe if available; returns seconds or None.
    """
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            val = result.stdout.strip()
            return float(val)
    except Exception as e:
        LOGGER.debug(f"ffprobe duration failed: {e}")
    return None
