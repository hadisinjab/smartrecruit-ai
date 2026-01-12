"""Text refinement using Hugging Face API (مجاني)"""
import os
import requests
from typing import Optional


def refine_with_hf(text: str) -> str:
    """
    تحسين النص باستخدام Hugging Face API (مجاني تماماً)
    """
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key:
        print("Warning: HUGGINGFACE_API_KEY not set, returning original text")
        return text
    
    # نموذج مجاني للنصوص العربية والإنجليزية
    model = "google/flan-t5-large"
    api_url = f"https://router.huggingface.co/hf-inference/models/{model}"
    
    headers = {"Authorization": f"Bearer {api_key}"}
    
    prompt = f"""تحسين النص التالي عن طريق:
- إضافة الترقيم المناسب
- إزالة التكرارات
- تصحيح الأخطاء الإملائية البسيطة
- تحسين الصياغة
- الحفاظ على المعنى الأصلي

النص:
{text}

النص المحسن:"""
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_length": 512,
            "temperature": 0.3,
            "do_sample": True,
            "top_p": 0.9
        }
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            result = response.json()
            if result and len(result) > 0:
                refined_text = result[0].get("generated_text", "").strip()
                if refined_text and refined_text != text:
                    return refined_text
        else:
            print(f"HF API error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"HF API error: {e}")
    
    return text  # نرجع الأصلي في حال الخطأ