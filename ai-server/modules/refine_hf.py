"""Text refinement using Hugging Face API (مجاني)"""
import os
from huggingface_hub import InferenceClient


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
        client = InferenceClient(token=api_key)
        response = client.post(json=payload, model=model)
        
        # response is already parsed JSON bytes, need to load it
        import json
        result = json.loads(response.decode('utf-8'))
        
        if result and len(result) > 0:
            refined_text = result[0].get("generated_text", "").strip()
            if refined_text and refined_text != text:
                return refined_text
        else:
            print(f"HF API returned empty result")
    except Exception as e:
        print(f"HF API error: {e}")
    
    return text  # نرجع الأصلي في حال الخطأ
