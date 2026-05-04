/**
 * Test Worker — Background Processing
 * 
 * Processes test generation jobs from the BullMQ queue.
 * - Extracts text from PDF
 * - Chunks the text (RAG foundation)
 * - Sends chunks to AI
 * - Returns generated questions
 */

const { registerWorkerCallback } = require('../services/queueService');
const { extractTextFromPDF } = require('../services/pdfService');
const { splitIntoChunks, selectRelevantChunks } = require('../services/chunkService');
const aiService = require('../services/aiService');
const { logger } = require('../utils/logger');

// Simulate BullMQ Worker in memory
registerWorkerCallback(async (job) => {
  job.state = 'active';
  const { fileBufferArray, difficulty, numQuestions, userId } = job.data;
  
  try {
    // Reconstruct buffer from array representation
    const fileBuffer = Buffer.from(fileBufferArray);

    logger.info({ jobId: job.id, userId }, 'Worker started processing test generation');
    
    job.updateProgress(10); // 10%

    // 1. Extract
    const extractedText = await extractTextFromPDF(fileBuffer);
    job.updateProgress(40); // 40%

    // 2. Chunk (RAG Foundation)
    const chunks = splitIntoChunks(extractedText, 2500, 500);
    const relevantChunks = selectRelevantChunks(chunks, 4); // Take 4 chunks (~10k chars total)
    
    const combinedContext = relevantChunks.join('\n\n[...]\n\n');
    job.updateProgress(60); // 60%
    
    // 3. AI Generation
    const questions = await aiService.generateTestQuestions(combinedContext, difficulty, numQuestions, userId);
    job.updateProgress(100); // 100%

    logger.info({ jobId: job.id, numQuestions: questions.length }, 'Worker successfully completed test generation');
    
    job.returnvalue = { questions };
    job.state = 'completed';
  } catch (err) {
    logger.error({ jobId: job.id, err }, 'Job failed');
    job.failedReason = err.message;
    job.state = 'failed';
  }
});
