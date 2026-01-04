/**
 * Utility to evaluate assignment submissions using Ollama.
 * - Supports multiple assignment types: code, design, video, text
 * - Validates input and output
 * - Calculates weighted scores
 * - Returns structured evaluation results
 */
import { generateJSON, generateText } from './ollama.js';

const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

/**
 * Evaluate assignment submission
 *
 * @param {Object} assignment - Assignment data
 * @param {string} assignment.type - Assignment type: 'code', 'design', 'video', 'text'
 * @param {string} assignment.text_fields - Text/code content
 * @param {string} assignment.link_fields - Links (GitHub, video, etc.)
 * @param {Object} jobCriteria - Job requirements and evaluation criteria
 * @param {string[]} jobCriteria.required_skills - Required skills
 * @param {string} jobCriteria.assignment_description - What the assignment asks for
 * @param {Object} jobCriteria.weights - Scoring weights
 *
 * @returns {Promise<Object>} Evaluation results
 */
export async function evaluateAssignment(assignment, jobCriteria) {
  const t0 = Date.now();
  console.log(`Starting assignment evaluation. Type: ${assignment?.type}`);

  try {
    // 1. Validate Input
    const { valid, errors } = validateAssignment(assignment);
    if (!valid) {
      throw Object.assign(new Error('Invalid assignment data'), { details: errors.join('; ') });
    }

    if (!jobCriteria) {
      // Default fallback if missing
      jobCriteria = {
        required_skills: [],
        assignment_description: 'Not specified',
        weights: {}
      };
    }

    // 2. Select Prompt based on type
    const prompt = getPromptForType(assignment, jobCriteria);
    
    // 3. Call Ollama
    console.log('Sending prompt to Ollama...');
    const evaluation = await callOllamaWithRetry(prompt);

    // 4. Calculate Weighted Score
    const weights = getWeightsForType(assignment.type, jobCriteria.weights);
    const weightedScore = calculateWeightedScore(evaluation, weights);

    // 5. Determine Recommendation
    const meetsReq = evaluation.meets_requirements === true;
    const recommendation = getRecommendation(weightedScore, meetsReq);

    // 6. Return Result
    const processingTime = Number(((Date.now() - t0) / 1000).toFixed(2));
    
    return {
      success: true,
      evaluation: {
        scores: extractScores(evaluation, assignment.type),
        overall_score: evaluation.overall_score || weightedScore, // Prefer model's overall if reasonable, else calc
        weighted_score: weightedScore,
        strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
        weaknesses: Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses : [],
        specific_feedback: evaluation.specific_feedback || '',
        meets_requirements: meetsReq,
        recommendation
      },
      metadata: {
        assignment_type: assignment.type,
        processing_time: processingTime,
        ollama_model: DEFAULT_OLLAMA_MODEL
      }
    };

  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error('Evaluation error:', e.message);
    return {
      success: false,
      error: e.message,
      details: e.details || e.stack || String(e)
    };
  }
}

/**
 * Validate assignment data
 * @param {Object} assignment
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateAssignment(assignment) {
  const errors = [];
  if (!assignment || typeof assignment !== 'object') {
    errors.push('Assignment data is missing');
    return { valid: false, errors };
  }

  const validTypes = ['code', 'design', 'video', 'text'];
  if (!validTypes.includes(assignment.type)) {
    errors.push(`Invalid assignment type: ${assignment.type}`);
  }

  const hasText = assignment.text_fields && assignment.text_fields.trim().length > 0;
  const hasLinks = assignment.link_fields && assignment.link_fields.trim().length > 0;

  if (!hasText && !hasLinks) {
    errors.push('Assignment submission is empty (no text or links)');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get prompt based on assignment type
 */
function getPromptForType(assignment, jobCriteria) {
  const skills = (jobCriteria.required_skills || []).join(', ');
  const desc = jobCriteria.assignment_description || 'No description provided';
  const text = assignment.text_fields || 'N/A';
  const links = assignment.link_fields || 'N/A';

  const baseInstruction = `
    CRITICAL REQUIREMENTS:
    - Output ONLY valid JSON, no markdown, no explanations.
    - Start directly with { and end with }
  `;

  if (assignment.type === 'code') {
    return `You are an expert code reviewer. Evaluate this coding assignment.
    Job Requirements:
    - Required Skills: ${skills}
    - Assignment Task: ${desc}
    
    Candidate's Submission:
    Code:
    ${text}
    Repository/Links: ${links}
    
    Evaluate based on:
    1. Code Quality (0-100): Clean code, best practices, readability
    2. Problem Solving (0-100): Logic, algorithm efficiency, correctness
    3. Technical Skills (0-100): Use of required technologies
    4. Documentation (0-100): Comments, README, clarity
    
    Output ONLY valid JSON:
    {
      "code_quality": 0,
      "problem_solving": 0,
      "technical_skills": 0,
      "documentation": 0,
      "overall_score": 0,
      "strengths": ["..."],
      "weaknesses": ["..."],
      "specific_feedback": "...",
      "meets_requirements": true|false
    }
    ${baseInstruction}`;
  } else if (assignment.type === 'design') {
    return `You are an expert design reviewer. Evaluate this design assignment.
    Job Requirements:
    - Required Skills: ${skills}
    - Assignment Task: ${desc}
    
    Candidate's Submission:
    Description:
    ${text}
    Portfolio/Links:
    ${links}
    
    Evaluate based on:
    1. Creativity (0-100): Originality and innovation
    2. Technical Execution (0-100): Use of design tools and principles
    3. Presentation (0-100): How well the work is presented
    4. Relevance (0-100): Alignment with job requirements
    
    Output ONLY valid JSON:
    {
      "creativity": 0,
      "technical_execution": 0,
      "presentation": 0,
      "relevance": 0,
      "overall_score": 0,
      "strengths": ["..."],
      "weaknesses": ["..."],
      "specific_feedback": "...",
      "meets_requirements": true|false
    }
    ${baseInstruction}`;
  } else {
    // video or text
    return `You are an expert evaluator. Assess this assignment submission.
    Job Requirements:
    - Required Skills: ${skills}
    - Assignment Task: ${desc}
    
    Candidate's Submission:
    Written Response:
    ${text}
    Video/Link: ${links}
    
    Evaluate based on:
    1. Content Quality (0-100): Depth and accuracy
    2. Communication (0-100): Clarity and structure
    3. Relevance (0-100): Answers the question/task
    4. Professionalism (0-100): Presentation quality
    
    Output ONLY valid JSON:
    {
      "content_quality": 0,
      "communication": 0,
      "relevance": 0,
      "professionalism": 0,
      "overall_score": 0,
      "strengths": ["..."],
      "weaknesses": ["..."],
      "specific_feedback": "...",
      "meets_requirements": true|false
    }
    ${baseInstruction}`;
  }
}

/**
 * Call Ollama with retry logic
 */
async function callOllamaWithRetry(prompt, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`Calling Ollama (attempt ${attempt + 1})...`);
      // Use ample tokens for detailed feedback
      const json = await generateJSON(prompt, { temperature: 0.1, max_tokens: 2048 });
      return json;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.warn(`Ollama attempt ${attempt + 1} failed:`, e.message);
      
      const connError = /ECONNREFUSED|ENOTFOUND|fetch failed|socket hang up/i.test(e.message);
      if (connError) {
        throw Object.assign(new Error('Evaluation service unavailable'), { details: e.message });
      }
      
      if (attempt === retries) {
        throw Object.assign(new Error('Failed to parse evaluation result'), { details: e.message });
      }
    }
  }
}

/**
 * Get default or custom weights
 */
function getWeightsForType(type, customWeights = {}) {
  const defaults = {
    code: { code_quality: 0.3, problem_solving: 0.4, technical_skills: 0.2, documentation: 0.1 },
    design: { creativity: 0.3, technical_execution: 0.3, presentation: 0.2, relevance: 0.2 },
    video: { content_quality: 0.4, communication: 0.3, relevance: 0.2, professionalism: 0.1 },
    text: { content_quality: 0.4, communication: 0.3, relevance: 0.2, professionalism: 0.1 }
  };
  const def = defaults[type] || defaults.text;
  return { ...def, ...customWeights };
}

/**
 * Calculate weighted overall score
 * @param {Object} scores - Individual scores from JSON
 * @param {Object} weights - Weight for each criterion
 * @returns {number} Weighted score (0-100)
 */
function calculateWeightedScore(scores, weights) {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = Number(scores[key]) || 0;
    totalScore += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Number((totalScore / totalWeight).toFixed(1));
}

/**
 * Extract individual criterion scores based on type
 */
function extractScores(evaluation, type) {
  const keysMap = {
    code: ['code_quality', 'problem_solving', 'technical_skills', 'documentation'],
    design: ['creativity', 'technical_execution', 'presentation', 'relevance'],
    video: ['content_quality', 'communication', 'relevance', 'professionalism'],
    text: ['content_quality', 'communication', 'relevance', 'professionalism']
  };
  
  const keys = keysMap[type] || keysMap.text;
  const result = {};
  keys.forEach(k => {
    result[k] = Number(evaluation[k]) || 0;
  });
  return result;
}

/**
 * Determine recommendation based on score
 * @param {number} overallScore
 * @param {boolean} meetsRequirements
 * @returns {string} 'Strong Pass' | 'Pass' | 'Review' | 'Fail'
 */
function getRecommendation(overallScore, meetsRequirements) {
  if (!meetsRequirements && overallScore < 70) return 'Fail';
  if (overallScore >= 85) return 'Strong Pass';
  if (overallScore >= 70) return 'Pass';
  if (overallScore >= 50) return 'Review';
  return 'Fail';
}

/**
 * Parse link_fields
 * @param {string} linkFields
 * @returns {string[]} Array of links
 */
export function parseLinks(linkFields) {
  if (!linkFields || typeof linkFields !== 'string') return [];
  // Match URLs
  const urlRegex = /(https?:\/\/[^\s,]+)/g;
  return linkFields.match(urlRegex) || [];
}
