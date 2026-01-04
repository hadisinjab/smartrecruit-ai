"""Text refinement with Ollama via HTTP API."""
from __future__ import annotations

import json
import os
from typing import Dict, Any, Optional

import requests

from .utils import LOGGER, normalize_text


def _ollama_endpoint() -> str:
    host = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
    return f"{host}/api/generate"


def refine_with_ollama(text: str, temperature: float = 0.2, max_tokens: int = 512) -> str:
    """
    Refine raw transcript using Ollama with English prompt. On failure, return original text.
    """
    model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    normalized = normalize_text(text)
    prompt = f"""You are a text refinement assistant specialized in cleaning up voice transcriptions.

Task: Improve the following transcribed text while preserving:
- The original meaning completely
- Technical terms as they are
- Context and sequence

Please:
- Add appropriate punctuation
- Remove repetitions and filler words (um, uh, you know, etc.)
- Fix minor spelling errors
- Improve formatting and clarity
- Keep the same language as the input

Output ONLY the refined text with no additional comments:

Raw text:
{normalized}"""
    payload = {
        "model": model,
        "prompt": prompt,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
        "stream": False,
    }
    try:
        r = requests.post(_ollama_endpoint(), json=payload, timeout=30)
        r.raise_for_status()
        data = r.json()
        response = (data.get("response") or "").strip()
        return response or text
    except Exception as e:
        LOGGER.error(f"Ollama refine error: {e}")
        return text


def refine_to_json(prompt: str, temperature: float = 0.0, max_tokens: int = 512) -> Dict[str, Any]:
    """
    Generate structured JSON from Ollama using format=json.
    """
    model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    payload = {
        "model": model,
        "prompt": normalize_text(prompt),
        "format": "json",
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
        "stream": False,
    }
    try:
        r = requests.post(_ollama_endpoint(), json=payload, timeout=30)
        r.raise_for_status()
        data = r.json()
        raw = (data.get("response") or "").strip()
        return json.loads(raw)
    except json.JSONDecodeError as je:
        LOGGER.error(f"Failed to parse JSON from Ollama: {je}")
        raise
    except Exception as e:
        LOGGER.error(f"Ollama JSON refine error: {e}")
        raise
