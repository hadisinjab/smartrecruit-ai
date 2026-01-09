"""Audio analysis and text refinement without external APIs (5 خطوات محلية)"""
import re
import os
from typing import Optional, Dict, Any, List

def refine_audio_transcript(raw_transcript: str, audio_path: Optional[str] = None) -> str:
    """
    تحليل وتحسين النص المستخرج من الصوت بـ 5 خطوات محلية
    
    الخطوات:
    1. تنظيف النص من التشويش
    2. تحليل البنية النحوية
    3. تصحيح الأخطاء اللغوية البسيطة
    4. تحسين الصياغة والترابط
    5. إعادة صياغة احترافية
    """
    if not raw_transcript or not raw_transcript.strip():
        return raw_transcript
    
    print(f"[خطوة 1] تنظيف النص الأصلي...")
    cleaned = _step1_clean_transcript(raw_transcript)
    
    print(f"[خطوة 2] تحليل البنية النحوية...")
    analyzed = _step2_analyze_structure(cleaned)
    
    print(f"[خطوة 3] تصحيح الأخطاء اللغوية...")
    corrected = _step3_correct_errors(analyzed)
    
    print(f"[خطوة 4] تحسين الصياغة والترابط...")
    improved = _step4_improve_coherence(corrected)
    
    print(f"[خطوة 5] إعادة الصياغة النهائية...")
    final = _step5_professional_rephrase(improved)
    
    print(f"✅ تم تحليل النص بنجاح!")
    return final

def _step1_clean_transcript(text: str) -> str:
    """الخطوة 1: تنظيف النص من التشويش والضوضاء"""
    # حذف كلمات التعبير المملة
    filler_patterns = [
        r'\b(امم+|ام+|اه|ايه|يعني|كده|يعني كده|ايوه)\b',
        r'\b(uh+|um+|ah+|like|you know|i mean|well|so)\b',
        r'\b(يعني|بمعنى|كمان|كده|اللي هو)\b',  # كلمات عربية مملة
    ]
    
    cleaned = text.lower()
    for pattern in filler_patterns:
        cleaned = re.sub(pattern, ' ', cleaned, flags=re.IGNORECASE)
    
    # حذف الأصوات المتكررة
    cleaned = re.sub(r'([a-z])\1{3,}', r'\1', cleaned)  # حذف تكرار الحروف
    cleaned = re.sub(r'(.)\1{4,}', r'\1\1', cleaned)  # تقليل التكرار
    
    # تصحيح المسافات
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    return cleaned.strip()

def _step2_analyze_structure(text: str) -> str:
    """الخطوة 2: تحليل البنية النحوية وتقسيم الجمل"""
    # تقسيم النص إلى جمل
    sentences = re.split(r'[.!?]+', text)
    
    analyzed_sentences = []
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence.split()) > 2:  # نجاهل الجمل القصيرة جداً
            # تحليل طول الجملة
            word_count = len(sentence.split())
            if word_count > 20:  # لو الجملة طويلة، نقسمها
                # نبحث عن كلمات الربط
                connectors = ['و', 'ثم', 'لكن', 'لذلك', 'بسبب', 'حيث', 'بينما']
                for connector in connectors:
                    if connector in sentence:
                        parts = sentence.split(connector, 1)
                        if len(parts) > 1:
                            analyzed_sentences.append(parts[0].strip() + '.')
                            analyzed_sentences.append(connector + ' ' + parts[1].strip())
                            break
                else:
                    analyzed_sentences.append(sentence)
            else:
                analyzed_sentences.append(sentence)
    
    return ' '.join(analyzed_sentences)

def _step3_correct_errors(text: str) -> str:
    """الخطوة 3: تصحيح الأخطاء اللغوية البسيطة"""
    # قاموس تصحيحات بسيطة
    corrections = {
        'انا': 'أنا',
        'انت': 'أنت',
        'انتي': 'أنتِ',
        'انتما': 'أنتما',
        'انتم': 'أنتم',
        'انتن': 'أنتن',
        'هوا': 'هو',
        'هيا': 'هي',
        'احنا': 'نحن',
        'انتو': 'أنتم',
        'ديه': 'هذه',
        'ده': 'هذا',
        'ال': 'ال',
        'فيي': 'في',
        'علي': 'على',
        'الي': 'إلى',
        'او': 'أو',
        'وا': 'و',
        'ها': 'هذا',
        'هاذا': 'هذا',
        'التى': 'التي',
        'الذى': 'الذي',
        'التي': 'التي',
        'الذي': 'الذي'
    }
    
    words = text.split()
    corrected_words = []
    
    for word in words:
        # نبحث عن التصحيح
        if word in corrections:
            corrected_words.append(corrections[word])
        else:
            corrected_words.append(word)
    
    return ' '.join(corrected_words)

def _step4_improve_coherence(text: str) -> str:
    """الخطوة 4: تحسين الصياغة والترابط"""
    # تحسين الروابط
    coherence_improvements = {
        'و و': 'و',
        'و. و': '. و',
        'ثم ثم': 'ثم',
        'لكن لكن': 'لكن',
        'لذلك لذلك': 'لذلك',
        '  ': ' ',  # مسافات مزدوجة
    }
    
    improved = text
    for old, new in coherence_improvements.items():
        improved = improved.replace(old, new)
    
    # تحسين بداية الجمل
    sentence_starters = {
        'و انا': 'أما أنا ف',
        'و انت': 'أما أنت ف',
        'و هو': 'أما هو ف',
        'و هي': 'أما هي ف',
        'لذلك انا': 'لذلك أنا',
        'لذلك انت': 'لذلك أنت'
    }
    
    for old, new in sentence_starters.items():
        improved = improved.replace(old, new)
    
    return improved.strip()

def _step5_professional_rephrase(text: str) -> str:
    """الخطوة 5: إعادة الصياغة بشكل احترافي"""
    # نبحث عن كلمات مهنية بديلة
    professional_words = {
        'عملت': 'قمت بـ',
        'رحت': 'ذهبت',
        'جيت': 'أتيت',
        'شفت': 'رأيت',
        'عرفت': 'علمت',
        'فهمت': 'تفهمت',
        'حبيت': 'أحببت',
        'كرهت': 'أكرهت',
        'قدرت': 'تمكنت',
        'عجزت': 'عجزت',
        'نجحت': 'نجحت',
        'فشلت': 'فشلت'
    }
    
    words = text.split()
    professional_words_list = []
    
    for word in words:
        if word in professional_words:
            professional_words_list.append(professional_words[word])
        else:
            professional_words_list.append(word)
    
    # نضيف ترقيم مناسب
    result = ' '.join(professional_words_list)
    
    # نضمن إن الجمل تبدأ بحرف كبير
    sentences = re.split(r'[.!?]+', result)
    final_sentences = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        if sentence:
            final_sentences.append(sentence.capitalize())
    
    # نعيد الترقيم
    final_text = '. '.join(final_sentences)
    
    # نضيف نقطة نهاية لو محتاج
    if final_text and not final_text.endswith(('.', '!', '?')):
        final_text += '.'
    
    return final_text

def extract_audio_metadata(audio_path: str) -> Dict[str, Any]:
    """استخراج معلومات إضافية من ملف الصوت"""
    try:
        stat = os.stat(audio_path)
        return {
            "duration_seconds": 0,  # ممكن نضيف later
            "file_size_bytes": stat.st_size,
            "format": audio_path.split('.')[-1].lower() if '.' in audio_path else "unknown",
            "processing_steps": 5,
            "refinement_method": "local_analysis"
        }
    except Exception as e:
        return {
            "duration_seconds": 0,
            "file_size_bytes": 0,
            "format": "unknown",
            "processing_steps": 5,
            "refinement_method": "local_analysis",
            "error": str(e)
        }