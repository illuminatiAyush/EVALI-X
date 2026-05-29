// ==============================================================================
// REQUIREMENT 2 & 3: FASTIFY SERVICES (services/assessmentService.js)
// ==============================================================================

const aiService = require('./aiService'); 

/**
 * Requirement 2: Schedule an Assessment
 * Orchestrates AI generation and transactional database inserts
 */
async function scheduleAssessment(fastify, { pdfText, batchId, scheduledFor, expiresAt, durationMinutes, teacherId }) {
  // Use fastify.supabase if available, otherwise need to import utility
  const supabaseAdmin = fastify.supabase || require('../utils/supabaseClient').supabaseAdmin;

  // 1. Send the raw PDF text to the LLM (Groq/Gemini) to generate structured test questions
  const generatedTest = await aiService.generateTestQuestions(pdfText); 
  
  if (!generatedTest || !generatedTest.questions) {
    throw new Error('AI failed to generate valid questions from the provided text.');
  }

  // 2. Insert the top-level Assessment record linked to the batch
  const { data: assessment, error: assessmentError } = await supabaseAdmin
    .from('assessments')
    .insert({
      teacher_id: teacherId,
      batch_id: batchId,
      scheduled_for: scheduledFor,
      expires_at: expiresAt,
      duration_minutes: durationMinutes,
      status: 'scheduled'
    })
    .select()
    .single();

  if (assessmentError) throw new Error(`Assessment DB Error: ${assessmentError.message}`);

  // 3. Format generated questions to match the Supabase schema and include the new assessment_id
  const questionsToInsert = generatedTest.questions.map((q, index) => ({
    assessment_id: assessment.id,
    question: q.question,
    options: q.options,
    answer: q.answer,
    sort_order: index + 1
  }));

  // 4. Batch insert all questions associated with this assessment
  const mappedQuestions = generatedTest.questions.map((q, index) => ({
    assessment_id: assessment.id,
    question: q.question,
    options: q.options,
    answer: q.answer,
    sort_order: index + 1
  }));

  const { error: questionsError } = await supabaseAdmin
    .from('questions')
    .insert(mappedQuestions);

  if (questionsError) throw new Error(`Questions DB Error: ${questionsError.message}`);

  return assessment;
}

/**
 * Requirement 3: Get Student Assessments
 * Fetches data from the heavily optimized SQL View `student_assessments_view`
 */
async function getStudentAssessments(fastify, studentId) {
  const supabaseAdmin = fastify.supabase || require('../utils/supabaseClient').supabaseAdmin;

  // We utilize the SQL View so the exact 'LOCKED', 'ACTIVE', 'MISSED' state is calculated 
  // perfectly against the database server's atomic clock rather than relying on Node.js Date objects.
  const { data, error } = await supabaseAdmin
    .from('student_assessments_view')
    .select('*')
    .eq('student_id', studentId)
    .order('scheduled_for', { ascending: true }); // Show upcoming tasks first

  if (error) throw new Error(`Student Fetch DB Error: ${error.message}`);

  return data;
}

module.exports = {
  scheduleAssessment,
  getStudentAssessments
};
