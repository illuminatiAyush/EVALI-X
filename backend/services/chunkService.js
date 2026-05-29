/**
 * Chunk Service — RAG Foundation
 * 
 * Handles splitting large texts into manageable chunks to prevent AI token overflow
 * and ensure higher quality extraction by focusing context.
 */

const { logger } = require('../utils/logger');

/**
 * Splits text into overlapping chunks.
 * @param {string} text - The full text to split.
 * @param {number} chunkSize - The size of each chunk in characters.
 * @param {number} overlap - The overlap size in characters.
 * @returns {string[]} Array of text chunks.
 */
function splitIntoChunks(text, chunkSize = 2000, overlap = 400) {
  if (!text) return [];
  
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  logger.info({ originalLength: text.length, numChunks: chunks.length, chunkSize }, 'Text split into chunks');
  return chunks;
}

/**
 * Selects the most relevant chunks.
 * (Placeholder for future embeddings/vector similarity search).
 * Currently just returns the first N chunks or a distributed sample.
 */
function selectRelevantChunks(chunks, limit = 5) {
  if (chunks.length <= limit) return chunks;
  
  logger.info({ totalChunks: chunks.length, selectedLimit: limit }, 'Selecting relevant chunks (placeholder logic)');
  // Initial naive logic: grab the beginning and end, and some middle chunks
  // This is better than just the first 5, as it covers the document spread
  const selected = [];
  const step = Math.floor(chunks.length / limit);
  
  for (let i = 0; i < limit; i++) {
    const index = Math.min(i * step, chunks.length - 1);
    if (!selected.includes(chunks[index])) {
      selected.push(chunks[index]);
    }
  }
  
  return selected;
}

module.exports = {
  splitIntoChunks,
  selectRelevantChunks
};
