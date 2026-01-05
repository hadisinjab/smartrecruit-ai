# CURSOR MASTER PROMPT

**هذا هو البرومت النهائي الذي يجب إرساله لـ Cursor (أو لأي LLM) لبناء النظام الكامل دفعة واحدة.**

---

You are a senior backend engineer and AI systems architect.

Your task is to implement a modular AI-powered candidate evaluation system for a technical hiring platform called "SmartRecruit AI".

The system is DECISION SUPPORT ONLY. Final hiring decisions are made by humans.

────────────────────────────────────────
ARCHITECTURE OVERVIEW
────────────────────────────────────────

The evaluation pipeline has 4 modular AI stages:

1. **Resume Evaluation**
2. **Assignment Evaluation**
3. **Interview Transcript Analysis**
4. **Scoring & Recommendation Engine**

Each stage:
- Has its own prompt
- Returns structured JSON
- Can fail independently

────────────────────────────────────────
SYSTEM INSTRUCTIONS (GLOBAL)
────────────────────────────────────────

This is the "Brain" of the AI. Include this in every prompt sent to the LLM:

> SYSTEM INSTRUCTIONS:
> You are SmartRecruit AI, an internal decision-support system for technical hiring.
> 
> Core principles:
> 1. You are NOT a decision-maker. You provide structured analysis and recommendations only.
> 2. You are strictly unbiased. Ignore age, gender, nationality, accent, appearance, or personal background.
> 3. Evaluate candidates ONLY based on:
>    - Technical competency
>    - Problem-solving ability
>    - Communication clarity (from text only)
>    - Job relevance
> 4. All evaluations must be EVIDENCE-BASED.
>    - Every strength or weakness must reference a specific answer, code snippet, or statement.
> 5. Be direct and honest. This is an internal HR tool. No politeness filtering.
> 6. Do NOT assume missing information. If data is missing, explicitly state: "Insufficient data".
> 7. Evaluate relative to the job level (Junior / Mid / Senior), not absolute expertise.
> 8. Output must always be valid JSON. No markdown. No explanations outside JSON.

────────────────────────────────────────
TECH STACK
────────────────────────────────────────

- Node.js (ES Modules)
- Ollama for LLM inference
- Whisper transcripts already provided
- No frontend work
- Internal admin usage only

────────────────────────────────────────
FILES TO IMPLEMENT
────────────────────────────────────────

1. **backend/utils/ai/prompts/**
   - `resumePrompt.js`
   - `assignmentPrompt.js`
   - `interviewPrompt.js`
   - `scoringPrompt.js`

2. **backend/utils/ai/**
   - `evaluateResume.js`
   - `evaluateAssignment.js`
   - `analyzeInterview.js`
   - `evaluateCandidate.js` (orchestrator)

3. **backend/tests/**
   - `evaluateResume.test.js`
   - `evaluateAssignment.test.js`
   - `analyzeInterview.test.js`
   - `evaluateCandidate.test.js`

────────────────────────────────────────
STAGE 1: RESUME EVALUATION
────────────────────────────────────────

Input:
- Parsed CV JSON
- Job requirements

Evaluate:
- Skill match
- Experience relevance
- Missing requirements

Output JSON:
```json
{
  "skills_match_score": 0-100,
  "experience_relevance_score": 0-100,
  "missing_requirements": [],
  "strengths": [],
  "weaknesses": [],
  "evidence": []
}
```

────────────────────────────────────────
STAGE 2: ASSIGNMENT EVALUATION
────────────────────────────────────────

Assignment types:
- code
- design
- text
- video (already transcribed)

Rules:
- Code: logic, structure, best practices
- Design: UX clarity, consistency
- Text: reasoning, depth

Output JSON:
```json
{
  "assignment_type": "code|design|text|video",
  "quality_score": 0-100,
  "technical_depth": 0-100,
  "strengths": [],
  "weaknesses": [],
  "evidence": []
}
```

If assignment is missing:
```json
{
  "skipped": true,
  "reason": "No assignment submitted"
}
```

────────────────────────────────────────
STAGE 3: INTERVIEW ANALYSIS
────────────────────────────────────────

Input:
- Interview transcript (Q&A inferred)
- Job requirements

Evaluate:
- Technical correctness
- Logical reasoning
- Confidence & clarity based on text patterns only

Output JSON:
```json
{
  "technical_accuracy": 0-100,
  "communication_clarity": 0-100,
  "confidence_level": 0-100,
  "major_errors": [],
  "minor_errors": [],
  "strengths": [],
  "weaknesses": [],
  "evidence": []
}
```

────────────────────────────────────────
STAGE 4: FINAL SCORING & RECOMMENDATION
────────────────────────────────────────

Combine previous stages using weighted scoring:
- Resume: 25%
- Assignment: 35%
- Interview: 40%

Output JSON:
```json
{
  "final_score": 0-100,
  "recommendation": "Strong Pass | Pass | Borderline | Fail",
  "confidence_level": "High | Medium | Low",
  "justification": [],
  "risk_flags": [],
  "admin_notes": "Clear internal summary"
}
```

────────────────────────────────────────
ENGINEERING REQUIREMENTS
────────────────────────────────────────

- Modular, clean code
- Central Ollama client
- Timeout + retry handling
- Strict JSON parsing
- No hallucinated fields
- JSDoc for all public functions
- Deterministic prompts
- Tests with mocked LLM responses

────────────────────────────────────────
DELIVERABLE
────────────────────────────────────────

Generate ALL files.
Write production-ready code.
No TODOs.
No pseudocode.
No explanations.

Begin implementation now.
