/**
 * PDF Service — Backend Text Extraction
 * 
 * Replaces the fragile browser-based extraction. Uses `pdf-parse` to handle
 * heavy PDF files on the backend without freezing the user's browser.
 */

const pdf = require('pdf-parse');
const { logger } = require('../utils/logger');

/**
 * Extracts and cleans text from a PDF buffer.
 * @param {Buffer} fileBuffer - The uploaded PDF file buffer.
 * @returns {Promise<string>} The extracted, cleaned text.
 */
async function extractTextFromPDF(fileBuffer) {
  try {
    const startTime = performance.now();
    
    // Parse the PDF
    const data = await pdf(fileBuffer);
    let text = data.text;

    // Stage 1: Smart Text Cleaning
    // Remove garbage symbols and non-printable characters
    text = text.replace(/[^\x20-\x7E\n]/g, '');
    
    // Normalize spaces and newlines
    text = text.replace(/\s+/g, ' ');
    
    // Remove repetitive patterns (e.g., "Page 1 of 10")
    text = text.replace(/\bPage \d+ of \d+\b/gi, '');
    
    text = text.trim();

    if (text.length < 50) {
      throw new Error('No sufficient readable text found in the PDF. It might be an image-based PDF or corrupted.');
    }

    const duration = (performance.now() - startTime).toFixed(0);
    logger.info({ pages: data.numpages, textLength: text.length, durationMs: duration }, 'PDF extraction completed');

    return text;
  } catch (error) {
    logger.error({ err: error }, 'Failed to extract text from PDF');
    throw new Error('PDF extraction failed: ' + error.message);
  }
}

module.exports = { extractTextFromPDF };
