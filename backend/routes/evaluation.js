/**
 * راوتر التقييمات مع نقطة صحّة.
 */
import { Router } from 'express';
import { supabase } from '../utils/supabase.js';
import { analyzeInterview, transcribeAudio } from '../utils/analyzeInterview.js';
import { evaluateAssignment } from '../utils/evaluateAssignment.js';
import { parseResume } from '../utils/parseResume.js';
import { downloadFile } from '../utils/download.js';
import fs from 'fs';
import { generateJSON, generateText } from '../utils/ollama.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', route: 'evaluation' });
});

/**
 * بدء تحليل شامل للمتقدم (مقابلة + واجب + سيرة ذاتية)
 * POST /api/evaluation/analyze/:applicationId
 */
router.post('/analyze/:applicationId', async (req, res) => {
  const { applicationId } = req.params;
  console.log(`[Evaluation] Analyzing Application ID: ${applicationId}`);
  
  try {
    // 0. تحقق من وجود الطلب أولاً (للتشخيص)
    const { data: checkApp, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .maybeSingle();
      
    if (checkError) {
      console.error('[Evaluation] Check Error:', checkError);
      return res.status(500).json({ error: true, message: `DB Check Error: ${checkError.message}` });
    }
    if (!checkApp) {
      console.error(`[Evaluation] Application ${applicationId} not found in simple query`);
      return res.status(404).json({ error: true, message: `Application ${applicationId} not found (Simple Query)` });
    }

    // 1. جلب بيانات المتقدم الكاملة
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        job_forms (
          title,
          description,
          evaluation_criteria
        ),
        interviews (
          id,
          audio_or_video_url,
          audio_analysis
        ),
        assignments (
          id,
          type,
          text_fields,
          link_fields
        ),
        resumes (
          id,
          file_url,
          parsed_data
        ),
        answers (
          id,
          question_id,
          value,
          voice_data,
          questions (
            type
          )
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('[Evaluation] DB Error:', appError);
      return res.status(404).json({ 
        error: true, 
        message: appError ? `DB Error: ${appError.message}` : 'Application not found in DB' 
      });
    }

    // Normalize answers to include type from joined questions
    if (application.answers) {
      application.answers = application.answers.map(a => {
        let rawType = (a.questions?.type || 'text').toLowerCase();
        let type = 'text';
        if (['voice', 'audio', 'voice_recording'].includes(rawType)) type = 'voice';
        else if (['text', 'short_text', 'long_text', 'textarea'].includes(rawType)) type = 'text';
        else if (['file', 'file_upload'].includes(rawType)) type = 'file';
        else if (['url', 'link'].includes(rawType)) type = 'url';
        
        return {
          ...a,
          type
        };
      });
    }

    // 1.1 Fetch application history
    let previousApplicationsCount = 0;
    if (application.candidate_email) {
      const { count, error: historyError } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_email', application.candidate_email)
        .lt('created_at', application.created_at); // Only count *previous* applications
      
      if (!historyError) {
        previousApplicationsCount = count || 0;
      }
    }

    const jobContext = {
      position: application.job_forms?.title || 'Unknown Position',
      required_skills: application.job_forms?.evaluation_criteria?.required_skills || [],
      key_topics: application.job_forms?.evaluation_criteria?.key_topics || [],
      weights: application.job_forms?.evaluation_criteria?.weights || {},
      assignment_description: application.job_forms?.evaluation_criteria?.assignment_description
    };

    let interviewResult = null;
    let assignmentResult = null;
    let resumeResult = null;
    let voiceTranscripts = [];
    let textAnswersAnalysis = null;

    // --- 2. تحليل المقابلة (مقابلة طويلة) ---
    if (application.interviews && application.interviews.length > 0) {
      const interview = application.interviews[0];
      if (interview.audio_or_video_url) {
        console.log('Starting Interview Analysis...');
        try {
          const tempPath = await downloadFile(interview.audio_or_video_url);
          // analyzeInterview handles extraction if needed
          interviewResult = await analyzeInterview(tempPath, 'video', jobContext);
          // Cleanup handled inside analyzeInterview if passed as path? 
          // analyzeInterview doesn't auto-delete input path if string, so we delete here
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch (e) {
          console.error('Interview analysis failed:', e);
          interviewResult = { error: e.message };
        }
      }
    }

    // --- 3. تحليل الواجب ---
    if (application.assignments && application.assignments.length > 0) {
      const assignment = application.assignments[0];
      console.log('Starting Assignment Evaluation...');
      assignmentResult = await evaluateAssignment({
        type: assignment.type,
        text_fields: assignment.text_fields,
        link_fields: assignment.link_fields
      }, jobContext);
    }

    // --- 4. تحليل السيرة الذاتية ---
    if (application.resumes && application.resumes.length > 0) {
       const resume = application.resumes[0];
       if (resume.file_url) {
         console.log('Starting Resume Parsing...');
         try {
            const tempPath = await downloadFile(resume.file_url);
            const buffer = fs.readFileSync(tempPath);
            const fileType = tempPath.endsWith('.pdf') ? 'pdf' : 'docx'; // Fixed detection
            resumeResult = await parseResume(buffer, fileType);
            
            // Save parsed data back to resumes table if successful
            if (resumeResult.success && resumeResult.data) {
               await supabase
                 .from('resumes')
                 .update({ parsed_data: resumeResult.data })
                 .eq('id', resume.id);
               
               // Analyze Resume against Job Description
               console.log('Analyzing Resume against Job Description...');
               const resumeAnalysisPrompt = `
               Evaluate this candidate's resume for the position of ${jobContext.position}.
               Required Skills: ${jobContext.required_skills.join(', ')}
               
               Resume Data:
               ${JSON.stringify(resumeResult.data).slice(0, 3000)}
               
               Output JSON:
               {
                 "match_score": 0-100,
                 "qualification_summary": "Concise summary of qualification fit",
                 "missing_critical_skills": ["..."],
                 "experience_relevance": "High|Medium|Low"
               }
               `;
               try {
                  const analysis = await generateJSON(resumeAnalysisPrompt, { temperature: 0.1 });
                  resumeResult.analysis = analysis;
               } catch (e) {
                  console.error('Resume Analysis failed:', e);
               }
            }
            
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
         } catch (e) {
            console.error('Resume parsing failed:', e);
            resumeResult = { error: e.message };
         }
       }
    }

    // --- 5. معالجة إجابات الأسئلة (صوتية ونصية) ---
    if (application.answers && application.answers.length > 0) {
      
      // A. Voice Answers -> Transcribe -> Refine -> Analyze
      const voiceAnswers = application.answers.filter(a => a.type === 'voice'); // Removed && a.value check
      
      // Fetch questions for voice answers
      const voiceQuestionIds = voiceAnswers.map(a => a.question_id);
      const { data: vQuestions } = await supabase
         .from('questions')
         .select('id, label')
         .in('id', voiceQuestionIds);
      const vQMap = {};
      if (vQuestions) vQuestions.forEach(q => vQMap[q.id] = q.label);

      for (const ans of voiceAnswers) {
        try {
          // Use voice_data if available (preferred), or value as fallback
          let audioUrl = ans.value;
          if (ans.voice_data && typeof ans.voice_data === 'object') {
             audioUrl = ans.voice_data.audio_url || ans.value;
          }

          if (!audioUrl) {
             console.log(`Skipping voice answer ${ans.id}: No audio URL found`);
             continue;
          }

          console.log(`Processing voice answer ${ans.id} (URL: ${audioUrl})...`);
          const tempPath = await downloadFile(audioUrl, '.wav');
          
          // 1. Transcribe (using direct transcribeAudio to skip redundant full analysis)
          const transcriptData = await transcribeAudio(tempPath);
          
          if (transcriptData && transcriptData.transcript) {
             const rawTranscript = transcriptData.transcript;
             
             // 2. Refine Transcript
             console.log('Refining transcript...');
             
             // Calculate Time to First Answer
             const firstSegmentStart = (transcriptData.segments && transcriptData.segments.length > 0) 
                ? transcriptData.segments[0].start 
                : 0;
             const timeToAnswer = Math.round(firstSegmentStart);
             
             const refinePrompt = `
             You are a professional editor. Correct the following transcript for grammar and clarity. 
             Remove filler words (um, uh) but keep the original meaning and tone.
             
             Original Text: "${rawTranscript}"
             
             Output ONLY the refined text.
             `;
             const refinedTranscript = await generateText(refinePrompt, { temperature: 0.1 });

             // 3. Analyze against Question
             const questionLabel = vQMap[ans.question_id] || 'Unknown Question';
             console.log(`Analyzing answer for question: ${questionLabel}`);
             
             const analysisPrompt = `
             Evaluate this candidate's answer to the specific interview question.
             
             Job Context: ${jobContext.position} (${jobContext.required_skills.join(', ')})
             Question: "${questionLabel}"
             Answer: "${refinedTranscript}"
             
             METRICS:
             - Time taken to start answering: ${timeToAnswer} seconds.
             
             CRITICAL INSTRUCTION:
             - If "Time taken to start answering" is > 15 seconds, you MUST flag this as a potential red flag (Candidate took too long, possibly searching for answer).
             - Mention this delay in "weaknesses" or "red_flags" if significant.
             
             Output valid JSON:
             {
               "quality_score": 0-100,
               "relevance": "high|medium|low",
               "answer_quality_summary": "Short sentence (e.g., 'Weak answer, lacks detail' or 'Strong, accurate answer')",
               "key_points": ["point1", "point2"],
               "strengths": ["..."],
               "weaknesses": ["..."]
             }`;
             
             const analysis = await generateJSON(analysisPrompt, { temperature: 0.2 });

             voiceTranscripts.push({
               question_id: ans.question_id,
               question: questionLabel,
               original_transcript: rawTranscript,
               refined_transcript: refinedTranscript,
               audio_url: ans.value,
               analysis: analysis
             });
          }
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch (e) {
          console.error(`Voice processing failed for ${ans.id}:`, e);
        }
      }

      // B. Smart Inference for Text Answers ONLY (Iterative Analysis)
      const textAnswers = application.answers.filter(a => ['text', 'long_text'].includes(a.type));
      
      if (textAnswers.length > 0) {
         console.log('Analyzing Text Answers Individually...');
         
         // Fetch questions to get context (labels)
         const textQuestionIds = textAnswers.map(a => a.question_id);
         const { data: questions } = await supabase
            .from('questions')
            .select('id, label, type')
            .in('id', textQuestionIds);
         
         const qMap = {};
         if (questions) questions.forEach(q => qMap[q.id] = q.label);

         const individualAnalyses = [];

         // 1. Analyze each Q&A individually
         for (const ans of textAnswers) {
            const questionLabel = qMap[ans.question_id] || 'Unknown Question';
            const miniPrompt = `
            Evaluate this specific Q&A for a ${jobContext.position} role.
            Question: "${questionLabel}"
            Answer: "${ans.value}"
            
            Context: Required skills are ${jobContext.required_skills.join(', ')}.

            Output JSON:
            {
              "quality_score": 0-100,
              "sentiment": "positive|neutral|negative",
              "key_fact": "extracted fact if any (e.g., 5 years experience) or null",
              "feedback": "short comment on quality"
            }`;

            try {
               const analysis = await generateJSON(miniPrompt, { temperature: 0.1 });
               individualAnalyses.push({
                  question_id: ans.question_id,
                  question: questionLabel,
                  answer: ans.value,
                  analysis: analysis
               });
            } catch (e) {
               console.error(`Failed to analyze QA ${ans.id}:`, e);
            }
         }

         // 2. Aggregate for Final Summary
         const aggregationPrompt = `
         Synthesize these individual Q&A analyses into a final candidate profile.

         Job: ${jobContext.position}
         Analyses:
         ${JSON.stringify(individualAnalyses, null, 2)}

         CRITICAL INSTRUCTION FOR SUMMARY:
         - Provide a descriptive but concise summary (approx 2 lines).
         - Explain the candidate's answers to the text questions clearly.
         - Focus on the content of their answers.

         Output JSON:
         {
           "inferred_facts": {
             "years_of_experience": "number or null",
             "location": "string or null",
             "age": "number or null",
             "skills_mentioned": ["..."],
             "tools_mentioned": ["..."]
           },
           "smart_summary": "Concise (2 lines) descriptive summary explaining the text answers...",
           "alignment_score": 0-100,
           "strengths": ["..."],
           "weaknesses": ["..."],
           "red_flags": ["..."]
         }
         `;

         try {
            const aggregated = await generateJSON(aggregationPrompt, { temperature: 0.1 });
            textAnswersAnalysis = {
               ...aggregated,
               individual_analyses: individualAnalyses // Store detailed per-question analysis
            };
         } catch (e) {
            console.error('QA Aggregation failed:', e);
         }
      }
    }

    // 6. تجميع النتائج وحفظها (Final Aggregation Stage)
    console.log('Generating Final Weighted Decision...');

    // A. Calculate Stage Metrics
    // 1. Text Metrics
    let textScore = 0;
    if (textAnswersAnalysis?.alignment_score) {
      textScore = textAnswersAnalysis.alignment_score;
    } else if (textAnswersAnalysis?.individual_analyses?.length > 0) {
      textScore = textAnswersAnalysis.individual_analyses.reduce((acc, curr) => acc + (curr.analysis?.quality_score || 0), 0) / textAnswersAnalysis.individual_analyses.length;
    }

    // 2. Voice Metrics
    let voiceScore = 0;
    if (voiceTranscripts.length > 0) {
      voiceScore = voiceTranscripts.reduce((acc, curr) => acc + (curr.analysis?.quality_score || 0), 0) / voiceTranscripts.length;
    }

    // 3. Assignment Metrics
    let assignmentScore = assignmentResult?.evaluation?.overall_score || 0;

    // 4. Resume Metrics (Simple Skill Match for now)
    let resumeScore = 0;
    if (resumeResult?.data?.skills?.technical && jobContext.required_skills.length > 0) {
       const resumeSkills = new Set(
         [...(resumeResult.data.skills.technical || []), ...(resumeResult.data.skills.languages || [])]
         .map(s => s.toLowerCase())
       );
       const matches = jobContext.required_skills.filter(s => 
         Array.from(resumeSkills).some(rs => rs.includes(s.toLowerCase()) || s.toLowerCase().includes(rs))
       );
       resumeScore = Math.min(100, Math.round((matches.length / jobContext.required_skills.length) * 100));
       // Boost score if confidence is high and experience exists
       if (resumeResult.data.work_experience?.length > 0) resumeScore = Math.min(100, resumeScore + 20);
    }

    // Detect available stages
    const hasText = !!textAnswersAnalysis;
    const hasVoice = voiceTranscripts.length > 0;
    const hasResume = !!resumeResult;
    const hasAssignment = !!assignmentResult;

    // B. AI Final Decision Prompt
    const finalDecisionPrompt = `
    You are a Senior Hiring Manager. Make a final hiring decision for this candidate based on the AVAILABLE evaluation stages.
    
    Job Position: ${jobContext.position}
    Required Skills: ${jobContext.required_skills.join(', ')}

    CANDIDATE HISTORY:
    - Previous Applications: ${previousApplicationsCount} (Count of times applied before this)

    STAGES DATA:
    1. Text Questions:
       ${hasText ? `- Score: ${Math.round(textScore)}/100
       - Summary: ${textAnswersAnalysis?.smart_summary || 'N/A'}` : '- Status: N/A (No text questions)'}
    
    2. Voice Questions:
       ${hasVoice ? `- Avg Score: ${Math.round(voiceScore)}/100
       - Answer Summaries: ${voiceTranscripts.map((v, i) => `Q${i+1}: ${v.analysis?.answer_quality_summary || 'N/A'}`).join('; ')}
       - Key Weaknesses: ${voiceTranscripts.flatMap(v => v.analysis?.weaknesses || []).join(', ')}` : '- Status: N/A (No voice questions)'}
    
    3. Resume:
       ${hasResume ? `- Skill Match Score: ${resumeScore}/100
       - AI Analysis: ${resumeResult?.analysis?.qualification_summary || 'N/A'}
       - Key Skills: ${resumeResult?.data?.skills?.technical?.slice(0, 5).join(', ') || 'N/A'}` : '- Status: N/A (No resume)'}
    
    4. Assignment:
       ${hasAssignment ? `- Score: ${Math.round(assignmentScore)}/100
       - Evaluation: ${assignmentResult?.evaluation?.answer_evaluation || 'N/A'}
       - Recommendation: ${assignmentResult?.evaluation?.recommendation || 'N/A'}` : '- Status: N/A (No assignment)'}

    DECISION RULES:
    - IGNORE stages marked as N/A.
    - Base your decision ONLY on the provided data.
    - Re-distribute the importance/weights to the available stages.
    - If only Resume/Text are available, base decision on skills and communication.
    - If Voice/Assignment are present, they remain critical.
    - CANDIDATE HISTORY FACTOR: If "Previous Applications" > 0, check if this application is better than average. If they are persistent but weak, Reject. If they show improvement, consider Interview.

    OUTPUT JSON ONLY:
    {
      "stage_evaluations": {
        "text": "Excellent|Good|Average|Weak|Bad|N/A",
        "voice": "Excellent|Good|Average|Weak|Bad|N/A",
        "resume": "Excellent|Good|Average|Weak|Bad|N/A",
        "assignment": "Excellent|Good|Average|Weak|Bad|N/A"
      },
      "final_score": 0-100,
      "decision": "Interview" (if Good/Excellent) or "Reject" (if Weak/Bad),
      "decision_reason": "Clear explanation citing available stages.",
      "action_item": "Schedule Interview | Send Rejection Email | Request Follow-up"
    }
    `;

    let finalDecision = {
       stage_evaluations: { text: 'N/A', voice: 'N/A', resume: 'N/A', assignment: 'N/A' },
       final_score: 0,
       decision: 'Review',
       decision_reason: 'Automated calculation only',
       action_item: 'Review Manually'
    };

    try {
       console.log('Calling Ollama for Final Decision...');
       finalDecision = await generateJSON(finalDecisionPrompt, { temperature: 0.1 });
    } catch (e) {
       console.error('Final Decision AI failed, using fallback calculation:', e);
       // Fallback weighted calc
       finalDecision.final_score = Math.round(
         (textScore * 0.15) + (voiceScore * 0.35) + (resumeScore * 0.15) + (assignmentScore * 0.35)
       );
       finalDecision.decision = finalDecision.final_score >= 70 ? 'Interview' : 'Reject';
    }

    const finalEvaluation = {
      application_id: applicationId,
      score: finalDecision.final_score, 
      ranking_score: finalDecision.final_score,
      strengths: [
         ...(interviewResult?.interview_analysis?.strengths || []),
         ...(assignmentResult?.evaluation?.strengths || []),
         ...(textAnswersAnalysis?.key_insights || [])
      ].slice(0, 5),
      weaknesses: [
         ...(interviewResult?.interview_analysis?.weaknesses || []),
         ...(assignmentResult?.evaluation?.weaknesses || []),
         ...(textAnswersAnalysis?.red_flags || [])
      ].slice(0, 5),
      recommendation: finalDecision.decision,
      analysis: {
        interview: interviewResult,
        assignment: assignmentResult,
        resume: resumeResult,
        voice_transcripts: voiceTranscripts,
        qa_analysis: textAnswersAnalysis,
        final_decision: finalDecision // Storing the structured decision
      },
      created_at: new Date().toISOString()
    };

    // Use explicit check-then-update/insert to avoid "no unique constraint" error on upsert
    const { data: existingEval } = await supabase
      .from('ai_evaluations')
      .select('id')
      .eq('application_id', applicationId)
      .maybeSingle();

    let saveError;
    if (existingEval) {
      const { error } = await supabase
        .from('ai_evaluations')
        .update(finalEvaluation)
        .eq('application_id', applicationId);
      saveError = error;
    } else {
      const { error } = await supabase
        .from('ai_evaluations')
        .insert(finalEvaluation);
      saveError = error;
    }

    if (saveError) {
      throw saveError;
    }

    res.json({ success: true, evaluation: finalEvaluation });

  } catch (error) {
    console.error('Analysis failed:', error);
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;

