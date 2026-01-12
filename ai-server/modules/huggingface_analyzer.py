"""
Hugging Face API integration for 5-step analysis
"""
import os
import requests
from typing import Dict, List, Optional, Any
from modules.utils import LOGGER


class HuggingFaceAnalyzer:
    def __init__(self):
        self.api_token = os.getenv("HUGGINGFACE_API_TOKEN")
        if not self.api_token:
            raise ValueError("HUGGINGFACE_API_TOKEN not found in environment")
        
        self.headers = {"Authorization": f"Bearer {self.api_token}"}
        self.api_base = "https://router.huggingface.co/hf-inference/models"
        
        # نماذج التحليل المختلفة
        self.models = {
            "question_classification": "facebook/bart-large-mnli",
            "sentiment_analysis": "cardiffnlp/twitter-roberta-base-sentiment-latest",
            "text_summarization": "facebook/bart-large-cnn",
            "text_classification": "facebook/bart-large-mnli",
            "arabic_nlp": "aubmindlab/bert-base-arabertv02",
            "generation": "HuggingFaceH4/zephyr-7b-beta",
            "generation_fallback": [
                "mistralai/Mistral-7B-Instruct-v0.2",
                "google/flan-t5-large",
                "tiiuae/falcon-7b-instruct",
                "gpt2"
            ]
        }
    
    def _make_api_call(self, model_name: str, payload: Dict, use_token: bool = True) -> Optional[Dict]:
        """API call to Hugging Face"""
        try:
            api_url = f"{self.api_base}/{model_name}"
            headers = self.headers if use_token else {}
            response = requests.post(api_url, headers=headers, json=payload)
            
            if response.status_code == 200:
                return response.json()
            else:
                LOGGER.error(f"HF API error for {model_name} (Token={use_token}): {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            LOGGER.error(f"Error calling Hugging Face API: {e}")
            return None
    
    def generate_text(self, prompt: str, params: Optional[Dict] = None) -> str:
        """توليد نص باستخدام نموذج توليدي مع محاولات احتياطية"""
        try:
            payload = {
                "inputs": f"<s>[INST] {prompt} [/INST]",
                "parameters": params or {
                    "max_new_tokens": 512,
                    "temperature": 0.3,
                    "top_p": 0.9,
                    "do_sample": True
                }
            }
            
            # محاولة النموذج الأساسي
            models_to_try = [self.models["generation"]] + self.models["generation_fallback"]
            
            for model in models_to_try:
                LOGGER.info(f"Trying generation with model: {model}")
                # Try with token first
                result = self._make_api_call(model, payload, use_token=True)
                
                # If failed (likely auth error), try without token for public models
                if not result:
                     LOGGER.info(f"Retrying {model} without token...")
                     result = self._make_api_call(model, payload, use_token=False)

                if result and isinstance(result, list) and len(result) > 0:
                    generated = result[0].get("generated_text", "")
                    # تنظيف النص
                    if "[/INST]" in generated:
                        generated = generated.split("[/INST]")[-1].strip()
                    if generated.strip(): # تأكد من أن النص ليس فارغاً
                        return generated
                
                LOGGER.warning(f"Model {model} returned empty or failed. Trying next...")
                
            return ""
            
        except Exception as e:
            LOGGER.error(f"Error generating text: {e}")
            return ""

    def analyze_question(self, question_text: str) -> Dict[str, Any]:
        """تحليل نوع السؤال"""
        try:
            payload = {
                "inputs": question_text,
                "parameters": {
                    "candidate_labels": ["technical", "behavioral", "experience", "education", "skills"]
                }
            }
            
            result = self._make_api_call(self.models["question_classification"], payload)
            
            if result and "labels" in result and "scores" in result:
                # نحصل على أعلى تصنيف
                max_score_idx = result["scores"].index(max(result["scores"]))
                question_type = result["labels"][max_score_idx]
                confidence = result["scores"][max_score_idx]
                
                return {
                    "type": question_type,
                    "confidence": confidence,
                    "all_scores": dict(zip(result["labels"], result["scores"]))
                }
            
            return {"type": "unknown", "confidence": 0.0, "all_scores": {}}
            
        except Exception as e:
            LOGGER.error(f"Error analyzing question: {e}")
            return {"type": "unknown", "confidence": 0.0, "all_scores": {}}
    
    def analyze_cv_text(self, cv_text: str) -> Dict[str, Any]:
        """تحليل السيرة الذاتية"""
        try:
            # تحليل المهارات
            skills_payload = {
                "inputs": cv_text,
                "parameters": {
                    "candidate_labels": ["technical_skills", "soft_skills", "languages", "education", "experience"]
                }
            }
            
            skills_result = self._make_api_call(self.models["text_classification"], skills_payload)
            
            # تلخيص النص
            summary_payload = {
                "inputs": cv_text,
                "parameters": {
                    "max_length": 150,
                    "min_length": 50
                }
            }
            
            summary_result = self._make_api_call(self.models["text_summarization"], summary_payload)
            
            analysis = {
                "skills": {},
                "summary": "",
                "education_level": "unknown",
                "experience_years": 0
            }
            
            if skills_result and "labels" in skills_result:
                analysis["skills"] = dict(zip(skills_result["labels"], skills_result["scores"]))
            
            if summary_result and isinstance(summary_result, list) and len(summary_result) > 0:
                analysis["summary"] = summary_result[0].get("summary_text", "")
            
            return analysis
            
        except Exception as e:
            LOGGER.error(f"Error analyzing CV: {e}")
            return {"skills": {}, "summary": "", "education_level": "unknown", "experience_years": 0}
    
    def analyze_job_description(self, job_text: str) -> Dict[str, Any]:
        """تحليل وصف الوظيفة"""
        try:
            payload = {
                "inputs": job_text,
                "parameters": {
                    "candidate_labels": ["technical_requirements", "soft_skills", "education", "experience", "responsibilities"]
                }
            }
            
            result = self._make_api_call(self.models["text_classification"], payload)
            
            if result and "labels" in result:
                requirements = {}
                for label, score in zip(result["labels"], result["scores"]):
                    if score > 0.3:  # فقط المتطلبات المهمة
                        requirements[label] = score
                
                return {
                    "requirements": requirements,
                    "key_skills": self._extract_keywords(job_text),
                    "experience_level": self._detect_experience_level(job_text)
                }
            
            return {"requirements": {}, "key_skills": [], "experience_level": "unknown"}
            
        except Exception as e:
            LOGGER.error(f"Error analyzing job description: {e}")
            return {"requirements": {}, "key_skills": [], "experience_level": "unknown"}
    
    def refine_transcript(self, raw_transcript: str) -> Dict[str, Any]:
        """تنقية النصوص (البديل للتحليل المحلي)"""
        try:
            # تحليل المشاعر
            sentiment_payload = {"inputs": raw_transcript}
            sentiment_result = self._make_api_call(self.models["sentiment_analysis"], sentiment_payload)
            
            # تلخيص
            summary_payload = {
                "inputs": raw_transcript,
                "parameters": {"max_length": 200, "min_length": 50}
            }
            summary_result = self._make_api_call(self.models["text_summarization"], summary_payload)
            
            refinement = {
                "cleaned_text": self._clean_text(raw_transcript),
                "sentiment": "neutral",
                "summary": "",
                "key_points": []
            }
            
            if sentiment_result and isinstance(sentiment_result, list) and len(sentiment_result) > 0:
                # نحصل على أعظم مشاعر
                top_sentiment = max(sentiment_result[0], key=lambda x: x["score"])
                refinement["sentiment"] = top_sentiment["label"]
            
            if summary_result and isinstance(summary_result, list) and len(summary_result) > 0:
                refinement["summary"] = summary_result[0].get("summary_text", "")
            
            refinement["key_points"] = self._extract_key_points(raw_transcript)
            
            return refinement
            
        except Exception as e:
            LOGGER.error(f"Error refining transcript: {e}")
            return {
                "cleaned_text": self._clean_text(raw_transcript),
                "sentiment": "neutral",
                "summary": "",
                "key_points": []
            }
    
    def _clean_text(self, text: str) -> str:
        """تنظيف النص من الكلمات الزائدة"""
        # إزالة الكلمات الزائدة
        fillers = ["يعني", "أيوة", "تمام", "بس", "يعني", "كده", "يعني"]
        cleaned = text
        for filler in fillers:
            cleaned = cleaned.replace(filler, "")
        
        # إزالة التكرارات
        import re
        cleaned = re.sub(r'\b(\w+)\s+\1\b', r'\1', cleaned)
        
        return cleaned.strip()
    
    def _extract_keywords(self, text: str) -> List[str]:
        """استخراج الكلمات المفتاحية"""
        # كلمات مفتاحية تقنية شائعة
        tech_keywords = [
            "python", "javascript", "react", "node", "django", "flask",
            "machine learning", "data analysis", "sql", "mongodb",
            "aws", "docker", "git", "api", "frontend", "backend"
        ]
        
        text_lower = text.lower()
        found_keywords = [kw for kw in tech_keywords if kw in text_lower]
        
        return found_keywords[:5]  # أول 5 كلمات
    
    def _detect_experience_level(self, text: str) -> str:
        """كشف مستوى الخبرة المطلوب"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ["senior", "5+ years", "7+ years", "10+ years"]):
            return "senior"
        elif any(word in text_lower for word in ["mid", "2-5 years", "3-5 years"]):
            return "mid"
        elif any(word in text_lower for word in ["junior", "entry", "0-2 years", "1-3 years"]):
            return "junior"
        else:
            return "unknown"
    
    def _extract_key_points(self, text: str) -> List[str]:
        """استخراج النقاط الرئيسية"""
        # نقسم النص إلى جمل
        sentences = text.replace('۔', '.').replace('،', ',').split('.')
        
        # نختار الجمل الأطول (غالباً فيها معلومات مهمة)
        key_points = []
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20:  # جمل طويلة نسبياً
                key_points.append(sentence)
        
        return key_points[:3]  # أول 3 نقاط مهمة


# دالة مساعدة للاستخدام السهل
def get_huggingface_analyzer() -> HuggingFaceAnalyzer:
    """إرجاع مثيل المحلل"""
    return HuggingFaceAnalyzer()