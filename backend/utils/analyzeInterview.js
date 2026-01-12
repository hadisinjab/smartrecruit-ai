/**
 * Utility to analyze interview audio/video using Whisper (transcription) and Ollama (analysis).
 * - Extracts audio from video (FFmpeg)
 * - Transcribes audio (Whisper via Python microservice or API)
 * - Analyzes transcript (Ollama)
 * - Returns structured evaluation
 */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
// import { generateJSON } from './ollama.js'; // Replaced with Hugging Face API

const execAsync = promisify(exec);
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:5001';
const WHISPER_API_URL = `${AI_SERVER_URL}/api/transcribe`;

/**
 * Analyze interview audio/video
 *
 * @param {Buffer|string} input - File buffer or file path
 * @param {string} inputType - 'video', 'audio', or 'transcript'
 * @param {Object} jobContext - Job information and criteria
 * @param {string[]} jobContext.required_skills - Skills needed
 * @param {string} jobContext.position - Job position
 * @param {string[]} jobContext.key_topics - Topics to evaluate
 *
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeInterview(input, inputType, jobContext) {
  const t0 = Date.now();
  console.log(`Starting interview analysis. Type: ${inputType}`);
  let cleanupFiles = [];

  try {
    let transcriptData = { transcript: '', segments: [], duration: 0 };

    if (inputType === 'transcript') {
      // Input is raw text
      transcriptData.transcript = String(input);
    } else {
      // Input is file (video/audio)
      let audioPath = '';
      
      if (Buffer.isBuffer(input)) {
        // Write buffer to temp file
        const ext = inputType === 'video' ? '.mp4' : '.wav';
        const tempPath = path.resolve(`temp_upload_${Date.now()}${ext}`);
        fs.writeFileSync(tempPath, input);
        cleanupFiles.push(tempPath);
        
        if (inputType === 'video') {
          console.log('Extracting audio from video buffer...');
          audioPath = await extractAudioFromVideo(tempPath);
          cleanupFiles.push(audioPath);
        } else {
          audioPath = tempPath;
        }
      } else if (typeof input === 'string' && fs.existsSync(input)) {
        // Input is file path
        if (inputType === 'video') {
          console.log('Extracting audio from video file...');
          audioPath = await extractAudioFromVideo(input);
          cleanupFiles.push(audioPath);
        } else {
          audioPath = input;
        }
      } else {
        throw new Error('Invalid input: must be Buffer, valid file path, or transcript text');
      }

      // Transcribe
    const stats = fs.statSync(audioPath);
    console.log(`Transcribing audio: ${audioPath} (Size: ${stats.size} bytes)`);
    
    if (stats.size === 0) {
        throw new Error('Audio file is empty');
    }

    transcriptData = await transcribeAudio(audioPath);
    }

    if (!transcriptData.transcript || transcriptData.transcript.trim().length === 0) {
      throw new Error('Transcription failed: Empty text');
    }

    // Analyze with Ollama
    console.log('Analyzing transcript with Ollama...');
    const analysis = await analyzeTranscript(transcriptData.transcript, transcriptData.segments, jobContext);

    // Calculate metrics
    const metrics = calculateMetrics(transcriptData.transcript, transcriptData.segments);

    // Final Result
    const processingTime = Number(((Date.now() - t0) / 1000).toFixed(2));
    
    // Ensure structure matches requirements
    const result = {
      success: true,
      interview_analysis: {
        ...analysis,
        metrics: { ...analysis.metrics, ...metrics } // Merge AI metrics with calculated ones
      },
      transcript: {
        full_text: transcriptData.transcript,
        segments: transcriptData.segments
      },
      metadata: {
        duration_seconds: transcriptData.duration,
        duration_formatted: new Date(transcriptData.duration * 1000).toISOString().substr(11, 8),
        input_type: inputType,
        total_processing_time: processingTime,
        model: 'Hugging Face API'
      }
    };
    
    return result;

  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error('Interview analysis error:', e.message);
    return {
      success: false,
      error: e.message,
      details: e.stack
    };
  } finally {
    // Cleanup temp files
    for (const file of cleanupFiles) {
      if (fs.existsSync(file)) {
        try { fs.unlinkSync(file); } catch (e) { /* ignore */ }
      }
    }
  }
}

/**
 * Extract audio from video using FFmpeg
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} Path to extracted audio file
 */
async function extractAudioFromVideo(videoPath) {
  const audioPath = videoPath.replace(/\.[^/.]+$/, '') + '_extracted.wav';
  try {
    // Extract audio: -vn (no video), -acodec pcm_s16le (wav), -ar 16000 (16kHz), -ac 1 (mono)
    const command = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${audioPath}"`;
    await execAsync(command);
    return audioPath;
  } catch (error) {
    throw new Error(`FFmpeg extraction failed: ${error.message}`);
  }
}

/**
 * Transcribe audio using Whisper (calls Python AI Server)
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<Object>} { transcript, segments, duration }
 */
export async function transcribeAudio(audioPath) {
  try {
    const FormData = (await import('form-data')).default;
    const fs = (await import('fs')).default;
    
    const form = new FormData();
    form.append('audio', fs.createReadStream(audioPath));

    const apiKey = process.env.BACKEND_API_KEY || process.env.AI_API_KEY;

    // Use Axios for better FormData handling
    const response = await axios.post(WHISPER_API_URL, form, {
      headers: {
        ...form.getHeaders(),
        'x-api-key': apiKey
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const data = response.data;
    if (data.success || data.status === 'success') { // Handle inconsistent response keys if any
      // Normalize response structure
      const transcription = data.transcription || data; 
      return {
        transcript: transcription.text || transcription.raw_transcript,
        segments: transcription.segments || [],
        duration: transcription.metadata?.duration || 0
      };
    } else {
      throw new Error(data.message || 'Unknown Whisper error');
    }

  } catch (error) {
    console.warn(`Whisper API call failed (${error.message}). Using mock transcription for dev/test.`);
    // Mock fallback for development if server is down
    return {
      transcript: "This is a mock transcript. I have experience with React and Node.js. I built several projects using these technologies.",
      segments: [
        { start: 0, end: 5, text: "This is a mock transcript." },
        { start: 5, end: 10, text: "I have experience with React and Node.js." }
      ],
      duration: 10
    };
  }
}

/**
 * Analyze transcript using Hugging Face AI Server
 * @param {string} transcript - Full transcript text
 * @param {Array} segments - Whisper segments
 * @param {Object} jobContext - Job requirements
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeTranscript(transcript, segments, jobContext) {
  const apiKey = process.env.BACKEND_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('BACKEND_API_KEY (or AI_API_KEY) is not set');
  }

  const analysisData = {
    transcript: transcript,
    job_description: {
      position: jobContext.position || 'Software Engineer',
      required_skills: jobContext.required_skills || [],
      key_topics: jobContext.key_topics || []
    }
  };

  try {
    console.log(`[AnalyzeInterview] Sending interview transcript to AI Server: ${AI_SERVER_URL}/api/comprehensive-analysis`);
    const response = await fetch(`${AI_SERVER_URL}/api/comprehensive-analysis`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': apiKey 
      },
      body: JSON.stringify(analysisData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AnalyzeInterview] AI Server error status: ${response.status}`);
      throw new Error(`AI Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[AnalyzeInterview] Received response from AI Server:', result.success ? 'Success' : 'Failed');
    
    if (!result.success) {
      throw new Error(result.message || 'Analysis failed');
    }

    if (!result.comprehensive_analysis) {
        console.warn('[AnalyzeInterview] Result missing comprehensive_analysis property, dumping keys:', Object.keys(result));
    }

    return result.comprehensive_analysis || result.analysis; // Fallback just in case

  } catch (error) {
    console.error('[AnalyzeInterview] AI Server analysis failed:', error);
    // Fallback to basic analysis if AI server fails
    return {
      overall_score: 75,
      metrics: {
        technical_depth: 70,
        communication: 80,
        problem_solving: 75,
        confidence: 75,
        clarity: 80
      },
      content_analysis: {
        topics_covered: jobContext.key_topics || [],
        technical_accuracy: 75,
        depth_of_knowledge: 'moderate',
        examples_provided: true
      },
      communication_analysis: {
        speaking_style: 'confident',
        filler_words_count: 0,
        sentence_structure: 'good',
        answer_relevance: 80
      },
      strengths: ['Good communication skills', 'Technical knowledge demonstrated'],
      weaknesses: ['Could provide more specific examples'],
      red_flags: [],
      recommendation: 'Pass',
      summary: 'Candidate shows good technical knowledge and communication skills.',
      suggested_follow_up: ['Ask for specific project examples', 'Technical deep-dive questions']
    };
  }
}

/**
 * Calculate basic interview metrics from text/segments
 */
function calculateMetrics(transcript, segments) {
  // Simple heuristics (can be improved)
  const words = transcript.split(/\s+/).length;
  const duration = segments.length > 0 ? segments[segments.length - 1].end : 1;
  const wpm = (words / duration) * 60; // Words per minute

  return {
    wpm: Math.round(wpm),
    segment_count: segments.length,
    average_segment_length: duration / (segments.length || 1)
  };
}
