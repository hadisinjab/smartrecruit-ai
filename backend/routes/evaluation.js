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
 * دالة المعالجة الخلفية (Background Processing)
 */
async function processEvaluation(application, applicationId) {
    console.log(`[Background] Starting processing for ${applicationId}`);
    
    try {
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
            console.log(`[Evaluation] Starting Interview Analysis for URL: ${interview.audio_or_video_url}`);
            try {
              const tempPath = await downloadFile(interview.audio_or_video_url);
              console.log(`[Evaluation] File downloaded to: ${tempPath}`);
              
              // analyzeInterview handles extraction if needed
              interviewResult = await analyzeInterview(tempPath, 'video', jobContext);
              
              console.log('[Evaluation] Interview Analysis Result:', interviewResult ? 'Has Data' : 'Null');
              if (interviewResult && interviewResult.error) {
                 console.error('[Evaluation] Interview Result contained error:', interviewResult.error);
              }

              if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            } catch (e) {
              console.error('[Evaluation] Interview analysis failed with exception:', e);
              interviewResult = { error: e.message };
            }
          } else {
            console.log('[Evaluation] Interview found but no audio/video URL');
          }
        } else {
            console.log('[Evaluation] No interviews found for application');
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
                const fileType = tempPath.endsWith('.pdf') ? 'pdf' : 'docx';
                resumeResult = await parseResume(buffer, fileType);
                
                if (resumeResult.success && resumeResult.data) {
                   await supabase
                     .from('resumes')
                     .update({ parsed_data: resumeResult.data })
                     .eq('id', resume.id);
                   
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
          
          // A. Voice Answers
          const voiceAnswers = application.answers.filter(a => a.type === 'voice');
          
          const voiceQuestionIds = voiceAnswers.map(a => a.question_id);
          const { data: vQuestions } = await supabase
             .from('questions')
             .select('id, label')
             .in('id', voiceQuestionIds);
          const vQMap = {};
          if (vQuestions) vQuestions.forEach(q => vQMap[q.id] = q.label);

          // Parallel Processing for Voice
          const voiceResults = await Promise.all(voiceAnswers.map(async (ans) => {
            try {
              let audioUrl = ans.value;
              if (ans.voice_data && typeof ans.voice_data === 'object') {
                 audioUrl = ans.voice_data.audio_url || ans.value;
              }

              if (!audioUrl) {
                 console.log(`Skipping voice answer ${ans.id}: No audio URL found`);
                 return null;
              }

              console.log(`Processing voice answer ${ans.id} (URL: ${audioUrl})...`);
              const tempPath = await downloadFile(audioUrl, '.wav');
              
              const transcriptData = await transcribeAudio(tempPath);
              
              if (transcriptData && transcriptData.transcript) {
                 const rawTranscript = transcriptData.transcript;
                 
                 console.log('Refining transcript...');
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

                 const questionLabel = vQMap[ans.question_id] || 'Unknown Question';
                 console.log(`Analyzing answer for question: ${questionLabel}`);
                 
                 const analysisPrompt = `
                 Evaluate this candidate's answer to the specific interview question.
                 
                 Job Context: ${jobContext.position} (${jobContext.required_skills.join(', ')})
                 Question: "${questionLabel}"
                 Answer: "${refinedTranscript}"
                 
                 METRICS:
                 - Time taken to start answering: ${timeToAnswer} seconds.
                 
                 Output valid JSON:
                 {
                   "quality_score": 0-100,
                   "relevance": "high|medium|low",
                   "answer_quality_summary": "Short sentence",
                   "key_points": ["point1", "point2"],
                   "strengths": ["..."],
                   "weaknesses": ["..."]
                 }`;
                 
                 const analysis = await generateJSON(analysisPrompt, { temperature: 0.2 });

                 if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

                 return {
                   question_id: ans.question_id,
                   question: questionLabel,
                   original_transcript: rawTranscript,
                   refined_transcript: refinedTranscript,
                   audio_url: ans.value,
                   analysis: analysis,
                   metrics: {
                      time_to_answer: timeToAnswer,
                      duration: transcriptData.duration
                   }
                 };
              }
              if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
              return null;
            } catch (e) {
              console.error(`Voice processing failed for ${ans.id}:`, e);
              return null;
            }
          }));
          
          voiceTranscripts.push(...voiceResults.filter(Boolean));

          // B. Text Answers
          const textAnswers = application.answers.filter(a => ['text', 'long_text'].includes(a.type));
          
          if (textAnswers.length > 0) {
             console.log('Analyzing Text Answers Individually...');
             
             const textQuestionIds = textAnswers.map(a => a.question_id);
             const { data: questions } = await supabase
                .from('questions')
                .select('id, label, type')
                .in('id', textQuestionIds);
             
             const qMap = {};
             if (questions) questions.forEach(q => qMap[q.id] = q.label);

             // Parallel Processing for Text
             const textResults = await Promise.all(textAnswers.map(async (ans) => {
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
                  "key_fact": "extracted fact if any",
                  "feedback": "short comment on quality"
                }`;

                try {
                   const analysis = await generateJSON(miniPrompt, { temperature: 0.1 });
                   return {
                      question_id: ans.question_id,
                      question: questionLabel,
                      answer: ans.value,
                      analysis: analysis
                   };
                } catch (e) {
                   console.error(`Failed to analyze QA ${ans.id}:`, e);
                   return null;
                }
             }));
             
             const individualAnalyses = textResults.filter(Boolean);

             // Aggregate Text
             const aggregationPrompt = `
             Synthesize these individual Q&A analyses into a final candidate profile.
             Job: ${jobContext.position}
             Analyses:
             ${JSON.stringify(individualAnalyses, null, 2)}

             Output JSON:
             {
               "inferred_facts": { "years_of_experience": "number or null" },
               "smart_summary": "Concise (2 lines) descriptive summary...",
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
                   individual_analyses: individualAnalyses
                };
             } catch (e) {
                console.error('QA Aggregation failed:', e);
             }
          }
        }

        // 6. تجميع النتائج وحفظها
        console.log('Generating Final Weighted Decision...');

        let textScore = 0;
        if (textAnswersAnalysis?.alignment_score) {
          textScore = textAnswersAnalysis.alignment_score;
        } else if (textAnswersAnalysis?.individual_analyses?.length > 0) {
          textScore = textAnswersAnalysis.individual_analyses.reduce((acc, curr) => acc + (curr.analysis?.quality_score || 0), 0) / textAnswersAnalysis.individual_analyses.length;
        }

        let voiceScore = 0;
        if (voiceTranscripts.length > 0) {
          voiceScore = voiceTranscripts.reduce((acc, curr) => acc + (curr.analysis?.quality_score || 0), 0) / voiceTranscripts.length;
        }

        let assignmentScore = assignmentResult?.evaluation?.overall_score || 0;

        let interviewScore = 0;
        let interviewSummary = 'N/A';
        if (interviewResult && !interviewResult.error) {
            if (interviewResult.compatibility_score !== undefined) {
                interviewScore = interviewResult.compatibility_score;
                interviewSummary = "Comprehensive AI Analysis completed.";
            } else if (interviewResult.overall_score !== undefined) {
                interviewScore = interviewResult.overall_score;
                interviewSummary = interviewResult.summary || "Basic analysis completed.";
            }
        }

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
           if (resumeResult.data.work_experience?.length > 0) resumeScore = Math.min(100, resumeScore + 20);
        }

        const hasText = !!textAnswersAnalysis;
        const hasVoice = voiceTranscripts.length > 0;
        const hasResume = !!resumeResult;
        const hasAssignment = !!assignmentResult;
        const hasInterview = !!(interviewResult && !interviewResult.error);

        console.log('[Evaluation] Calculated Scores:', {
            text: hasText ? textScore : 'N/A',
            voice: hasVoice ? voiceScore : 'N/A',
            interview: hasInterview ? interviewScore : 'N/A',
            assignment: hasAssignment ? assignmentScore : 'N/A',
            resume: hasResume ? resumeScore : 'N/A'
        });

        const finalDecisionPrompt = `
        You are a Senior Hiring Manager. Make a final hiring decision for this candidate based on the AVAILABLE evaluation stages.
        
        Job Position: ${jobContext.position}
        Required Skills: ${jobContext.required_skills.join(', ')}

        CANDIDATE HISTORY:
        - Previous Applications: ${previousApplicationsCount}

        STAGES DATA:
        1. Text Questions: ${hasText ? `- Score: ${Math.round(textScore)}/100, Summary: ${textAnswersAnalysis?.smart_summary || 'N/A'}` : 'N/A'}
        2. Voice Questions: ${hasVoice ? `- Avg Score: ${Math.round(voiceScore)}/100` : 'N/A'}
        3. Long Interview: ${hasInterview ? `- Score: ${Math.round(interviewScore)}/100, Summary: ${interviewSummary}` : 'N/A'}
        4. Resume: ${hasResume ? `- Skill Match: ${resumeScore}/100` : 'N/A'}
        5. Assignment: ${hasAssignment ? `- Score: ${Math.round(assignmentScore)}/100` : 'N/A'}

        OUTPUT JSON ONLY:
        {
          "stage_evaluations": { "text": "...", "voice": "...", "interview": "...", "resume": "...", "assignment": "..." },
          "final_score": 0-100,
          "decision": "Interview|Reject",
          "decision_reason": "...",
          "action_item": "..."
        }
        `;

        let finalDecision = {
           stage_evaluations: { text: 'N/A', voice: 'N/A', interview: 'N/A', resume: 'N/A', assignment: 'N/A' },
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
            final_decision: finalDecision
          },
          created_at: new Date().toISOString()
        };

        // Update DB
        const { data: existingEval } = await supabase
          .from('ai_evaluations')
          .select('id')
          .eq('application_id', applicationId)
          .maybeSingle();

        if (existingEval) {
          await supabase.from('ai_evaluations').update(finalEvaluation).eq('application_id', applicationId);
        } else {
          await supabase.from('ai_evaluations').insert(finalEvaluation);
        }

        console.log(`[Background] Analysis completed successfully for ${applicationId}`);

    } catch (error) {
        console.error(`[Background] Analysis failed for ${applicationId}:`, error);
        // Optionally update DB with error status
    }
}

/**
 * بدء تحليل شامل للمتقدم (مقابلة + واجب + سيرة ذاتية)
 * POST /api/evaluation/analyze/:applicationId
 */
router.post('/analyze/:applicationId', async (req, res) => {
  const { applicationId } = req.params;
  console.log(`[Evaluation] Request Received for Application ID: ${applicationId}`);
  
  try {
    // 0. تحقق من وجود الطلب
    const { data: checkApp, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .maybeSingle();
      
    if (checkError || !checkApp) {
      return res.status(404).json({ error: true, message: `Application not found` });
    }

    // 1. جلب بيانات المتقدم
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        job_forms (title, description, evaluation_criteria),
        interviews (id, audio_or_video_url, audio_analysis),
        assignments (id, type, text_fields, link_fields),
        resumes (id, file_url, parsed_data),
        answers (id, question_id, value, voice_data, questions (type))
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: true, message: 'Application details fetch failed' });
    }

    // Normalize answers
    if (application.answers) {
      application.answers = application.answers.map(a => {
        let rawType = (a.questions?.type || 'text').toLowerCase();
        let type = 'text';
        if (['voice', 'audio', 'voice_recording'].includes(rawType)) type = 'voice';
        else if (['text', 'short_text', 'long_text', 'textarea'].includes(rawType)) type = 'text';
        else if (['file', 'file_upload'].includes(rawType)) type = 'file';
        else if (['url', 'link'].includes(rawType)) type = 'url';
        return { ...a, type };
      });
    }

    // Return immediate response
    res.json({ 
        success: true, 
        message: 'Analysis started in background', 
        processing: true 
    });

    // Start background process (Fire & Forget)
    processEvaluation(application, applicationId);

  } catch (error) {
    console.error('Request setup failed:', error);
    if (!res.headersSent) {
        res.status(500).json({ error: true, message: error.message });
    }
  }
});

export default router;