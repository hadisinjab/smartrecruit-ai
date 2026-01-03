"""Simple test script to send an audio sample to /api/transcribe."""
from __future__ import annotations

import io
import math
import os
import struct
import wave
import requests


def generate_tone_wav(duration_s: float = 1.0, freq_hz: float = 440.0) -> bytes:
    """
    Generate a simple mono 16-bit PCM WAV tone and return bytes.
    """
    sample_rate = 16000
    n_samples = int(duration_s * sample_rate)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        for i in range(n_samples):
            t = i / sample_rate
            s = int(32767.0 * math.sin(2.0 * math.pi * freq_hz * t))
            w.writeframes(struct.pack("<h", s))
    return buf.getvalue()


def main() -> None:
    url = os.getenv("TEST_TRANSCRIBE_URL", "http://127.0.0.1:5001/api/transcribe")
    api_key = os.getenv("BACKEND_API_KEY", "your-secure-key-here")
    wav_bytes = generate_tone_wav(1.0, 440.0)
    # احفظ نسخة على القرص لاستخدامها مع سكربتات أخرى
    try:
        with open("sample.wav", "wb") as f:
            f.write(wav_bytes)
    except Exception:
        pass
    files = {
        "audio": ("tone.wav", wav_bytes, "audio/wav"),
    }
    headers = {"x-api-key": api_key}
    r = requests.post(url, files=files, headers=headers, timeout=120)
    print(r.status_code)
    try:
        print(r.json())
    except Exception:
        print(r.text)


if __name__ == "__main__":
    main()
