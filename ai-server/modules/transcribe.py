"""Speech-to-text module using faster-whisper or openai-whisper with type hints."""
from __future__ import annotations

import os
import time
from typing import Dict, Any, Optional, List, TypedDict

from .utils import LOGGER

def _get_faster_model():
    try:
        from faster_whisper import WhisperModel  # type: ignore
        return WhisperModel
    except Exception as e:  # pragma: no cover
        LOGGER.debug(f"faster-whisper import failed: {e}")
        return None

def _get_whisper_module():
    try:
        import whisper  # type: ignore
        return whisper
    except Exception as e:  # pragma: no cover
        LOGGER.debug(f"openai-whisper import failed: {e}")
        return None


class Segment(TypedDict):
    start: float
    end: float
    text: str


def _default_language() -> str:
    return os.getenv("TRANSCRIBE_LANGUAGE", "ar")


def transcribe_audio(file_path: str, model_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Transcribe an audio file and return a dict containing raw transcript,
    segments with timestamps, and metadata.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    model_name = model_name or os.getenv("WHISPER_MODEL", "medium")
    language = _default_language()
    LOGGER.info(f"Transcribing '{file_path}' with model '{model_name}' (lang={language})")

    start_time = time.time()
    raw_text: str = ""
    segments_out: List[Segment] = []
    detected_language: Optional[str] = None

    WhisperModel = _get_faster_model()
    if WhisperModel is not None:
        try:
            model = WhisperModel(model_name, device="auto")
            segments, info = model.transcribe(
                file_path,
                language=language,
                beam_size=int(os.getenv("TRANSCRIBE_BEAM_SIZE", "5")),
                best_of=int(os.getenv("TRANSCRIBE_BEST_OF", "5")),
            )
            for seg in segments:
                text_piece = (getattr(seg, "text", "") or "").strip()
                raw_text += text_piece + " "
                segments_out.append({
                    "start": float(getattr(seg, "start", 0.0)),
                    "end": float(getattr(seg, "end", 0.0)),
                    "text": text_piece,
                })
            raw_text = " ".join(raw_text.split()).strip()
            detected_language = getattr(info, "language", None)
            processing_time = round(time.time() - start_time, 3)
            return {
                "raw_transcript": raw_text,
                "segments": segments_out,
                "metadata": {
                    "language": detected_language or language,
                    "model": f"faster-whisper:{model_name}",
                    "processing_time": processing_time,
                },
            }
        except Exception as e:
            LOGGER.error(f"faster-whisper error: {e}")
            # fall through to whisper backend

    whisper = _get_whisper_module()
    if whisper is not None:
        try:
            mdl = whisper.load_model(model_name)
            result = mdl.transcribe(
                file_path,
                language=language,
                beam_size=int(os.getenv("TRANSCRIBE_BEAM_SIZE", "5")),
                best_of=int(os.getenv("TRANSCRIBE_BEST_OF", "5")),
            )
            raw_text = (result.get("text") or "").strip()
            segs = result.get("segments") or []
            for s in segs:
                segments_out.append({
                    "start": float(s.get("start") or 0.0),
                    "end": float(s.get("end") or 0.0),
                    "text": (s.get("text") or "").strip(),
                })
            detected_language = result.get("language") or language
            processing_time = round(time.time() - start_time, 3)
            return {
                "raw_transcript": raw_text,
                "segments": segments_out,
                "metadata": {
                    "language": detected_language,
                    "model": f"whisper:{model_name}",
                    "processing_time": processing_time,
                },
            }
        except Exception as e:
            LOGGER.error(f"whisper error: {e}")

    raise RuntimeError("No whisper backend available (faster-whisper or openai-whisper)")
