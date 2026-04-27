/**
 * Client-side PDF text extraction using pdfjs-dist.
 * Replaces the backend pdfService.js — no server needed.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Point to the local worker in the public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';


/**
 * Extracts text from a PDF File object.
 * @param {File} file - The PDF file from a file input or drag-drop.
 * @returns {Promise<string>} The extracted, cleaned text.
 */
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  // Stage 1: Smart Text Cleaning
  let text = fullText;
  
  // Remove garbage symbols and non-printable characters
  text = text.replace(/[^\x20-\x7E\n]/g, '');
  
  // Normalize spaces and newlines
  text = text.replace(/\s+/g, ' ');
  
  // Remove repetitive patterns (page numbers)
  text = text.replace(/\bPage \d+ of \d+\b/gi, '');
  
  text = text.trim();
  
  if (text.length < 50) {
    throw new Error('No sufficient readable text found in the PDF. It might be an image-based PDF or corrupted.');
  }

  return text;
}
