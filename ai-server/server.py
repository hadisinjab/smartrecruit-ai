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
import requests # Added for debug endpoint

from modules.utils import LOGGER, validate_api_key, audio_duration_seconds
from modules.transcribe import transcribe_audio
from modules.huggingface_analyzer import get_huggingface_analyzer  # Hugging Face API


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
    if request.path == "/health" or request.path == "/api/debug-hf":
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


@app.post("/api/generate")
def api_generate() -> Any:
    """نقطة نهاية عامة لتوليد النصوص (بديل لـ Ollama)"""
    try:
        data = request.get_json()
        if not data or "prompt" not in data:
            return jsonify({"error": True, "message": "No prompt provided"}), 400
            
        prompt = data["prompt"]
        params = data.get("options", {})
        
        analyzer = get_huggingface_analyzer()
        result = analyzer.generate_text(prompt, params)
        
        return jsonify({
            "success": True,
            "response": result
        })
    except Exception as e:
        LOGGER.error(f"Generation error: {e}")
        return jsonify({"error": True, "message": str(e)}), 500


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
        
        # استخدام Hugging Face API للتحليل
        try:
            analyzer = get_huggingface_analyzer()
            refinement_result = analyzer.refine_transcript(raw)
            clean = refinement_result.get("cleaned_text", raw)
            
            # إضافة معلومات التحليل للـ metadata
            metadata["sentiment"] = refinement_result.get("sentiment", "neutral")
            metadata["summary"] = refinement_result.get("summary", "")
            metadata["key_points"] = refinement_result.get("key_points", [])
            
        except Exception as hf_error:
            LOGGER.warning(f"Hugging Face API failed, using basic cleaning: {hf_error}")
            # نستخدم تنظيف بسيط كبديل
            clean = raw.strip()
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


@app.post("/api/analyze-question")
def api_analyze_question() -> Any:
    """تحليل نوع السؤال"""
    try:
        data = request.get_json()
        if not data or "question" not in data:
            return jsonify({"error": True, "message": "No question provided"}), 400
        
        analyzer = get_huggingface_analyzer()
        result = analyzer.analyze_question(data["question"])
        
        return jsonify({
            "success": True,
            "analysis": result
        })
        
    except Exception as e:
        LOGGER.error(f"Question analysis error: {e}")
        return jsonify({"error": True, "message": str(e)}), 500


@app.post("/api/analyze-cv")
def api_analyze_cv() -> Any:
    """تحليل السيرة الذاتية"""
    try:
        data = request.get_json()
        if not data or "cv_text" not in data:
            return jsonify({"error": True, "message": "No CV text provided"}), 400
        
        analyzer = get_huggingface_analyzer()
        result = analyzer.analyze_cv_text(data["cv_text"])
        
        return jsonify({
            "success": True,
            "analysis": result
        })
        
    except Exception as e:
        LOGGER.error(f"CV analysis error: {e}")
        return jsonify({"error": True, "message": str(e)}), 500


@app.post("/api/analyze-job")
def api_analyze_job() -> Any:
    """تحليل وصف الوظيفة"""
    try:
        data = request.get_json()
        if not data or "job_description" not in data:
            return jsonify({"error": True, "message": "No job description provided"}), 400
        
        analyzer = get_huggingface_analyzer()
        result = analyzer.analyze_job_description(data["job_description"])
        
        return jsonify({
            "success": True,
            "analysis": result
        })
        
    except Exception as e:
        LOGGER.error(f"Job analysis error: {e}")
        return jsonify({"error": True, "message": str(e)}), 500


@app.post("/api/comprehensive-analysis")
def api_comprehensive_analysis() -> Any:
    """التحليل الشامل (الربط بين كل العناصر)"""
    try:
        LOGGER.info("Received comprehensive analysis request")
        data = request.get_json()
        if not data:
            LOGGER.error("No data provided in request")
            return jsonify({"error": True, "message": "No data provided"}), 400
        
        # Log incoming data keys and sizes
        LOGGER.info(f"Request data keys: {list(data.keys())}")
        if "transcript" in data:
            LOGGER.info(f"Transcript length: {len(data['transcript'])}")
        if "job_description" in data:
            LOGGER.info(f"Job description present: {data['job_description'].keys()}")

        analyzer = get_huggingface_analyzer()
        
        # تحليل كل عنصر
        cv_analysis = {}
        job_analysis = {}
        transcript_analysis = {}
        
        if "cv_text" in data:
            LOGGER.info("Analyzing CV text...")
            cv_analysis = analyzer.analyze_cv_text(data["cv_text"])
        
        if "job_description" in data:
            LOGGER.info("Analyzing job description...")
            job_analysis = analyzer.analyze_job_description(data["job_description"])
        
        if "transcript" in data:
            LOGGER.info("Refining transcript...")
            transcript_analysis = analyzer.refine_transcript(data["transcript"])
        
        # الربط والمقارنة
        compatibility_score = 0
        if cv_analysis and job_analysis:
            compatibility_score = calculate_compatibility(cv_analysis, job_analysis)
        
        LOGGER.info("Analysis complete, sending response")
        return jsonify({
            "success": True,
            "comprehensive_analysis": {
                "cv_analysis": cv_analysis,
                "job_analysis": job_analysis,
                "transcript_analysis": transcript_analysis,
                "compatibility_score": compatibility_score,
                "recommendations": generate_recommendations(cv_analysis, job_analysis, transcript_analysis)
            }
        })
        
    except Exception as e:
        LOGGER.error(f"Comprehensive analysis error: {e}")
        return jsonify({"error": True, "message": str(e)}), 500


def calculate_compatibility(cv_analysis: Dict, job_analysis: Dict) -> float:
    """حساب نسبة التوافق بين السيرة الذاتية والوظيفة"""
    score = 0.0
    
    if cv_analysis.get("skills") and job_analysis.get("requirements"):
        cv_skills = set(cv_analysis["skills"].keys())
        job_reqs = set(job_analysis["requirements"].keys())
        
        if job_reqs:
            matching = len(cv_skills.intersection(job_reqs))
            score = (matching / len(job_reqs)) * 100
    
    return round(score, 2)


def generate_recommendations(cv_analysis: Dict, job_analysis: Dict, transcript_analysis: Dict) -> List[str]:
    """توليد توصيات بناءً على التحليل"""
    recommendations = []
    
    if cv_analysis.get("skills"):
        recommendations.append("تحليل المهارات في السيرة الذاتية مكتمل")
    
    if job_analysis.get("requirements"):
        recommendations.append("تم تحليل متطلبات الوظيفة بنجاح")
    
    if transcript_analysis.get("sentiment"):
        sentiment = transcript_analysis["sentiment"]
        if sentiment == "positive":
            recommendations.append("النغمة الإيجابية في المقابلة تدل على ثقة المرشح")
        elif sentiment == "negative":
            recommendations.append("ينصح بتحسين النغطة التعبيرية في المقابلات")
    
    return recommendations


@app.get("/api/debug-hf")
def debug_hf() -> Any:
    """Debug endpoint to check HF connectivity"""
    try:
        token = os.getenv("HUGGINGFACE_API_TOKEN")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        # Test GPT2
        r = requests.post("https://router.huggingface.co/hf-inference/models/gpt2", 
                          headers=headers, 
                          json={"inputs": "Hello, world", "parameters": {"max_new_tokens": 10}})
                          
        return jsonify({
            "status": r.status_code,
            "raw_response": r.text,
            "token_present": bool(token),
            "token_preview": f"{token[:4]}..." if token else None
        })
    except Exception as e:
        return jsonify({"error": str(e)})


def run() -> None:
    """
    Run the Flask app using env PORT.
    """
    port = int(os.environ.get('PORT', 5002))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)


if __name__ == "__main__":
    run()
