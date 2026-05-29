/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  SHARED TYPES — Evalix AI Data Structures                    ║
 * ║  Reference definitions for request/response shapes.           ║
 * ║  Not enforced at runtime (JS), but serves as documentation.   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

/**
 * @typedef {'easy' | 'medium' | 'hard'} Difficulty
 */

/**
 * @typedef {'mcq' | 'short' | 'long'} QuestionType
 */

/**
 * @typedef {Object} GenerateTestRequest
 * @property {string} prompt               - Topic or content to generate from
 * @property {Difficulty} [difficulty]      - Question difficulty level (default: 'medium')
 * @property {QuestionType[]} [types]      - Types of questions to generate (default: ['mcq'])
 * @property {number} [numQuestions]        - Number of questions (default: 10, max: 50)
 */

/**
 * @typedef {Object} MCQQuestion
 * @property {string} question            - The question text
 * @property {string[]} options           - Exactly 4 option strings
 * @property {'A'|'B'|'C'|'D'} answer    - Correct option letter
 * @property {number} sort_order          - Display order index
 */

/**
 * @typedef {Object} TextQuestion
 * @property {string} question            - The question text
 * @property {string} answer              - The answer text
 * @property {number} sort_order          - Display order index
 */

/**
 * @typedef {Object} GeneratedTest
 * @property {MCQQuestion[]} mcqs         - Multiple choice questions
 * @property {TextQuestion[]} shortAnswers - Short answer questions
 * @property {TextQuestion[]} longAnswers  - Long answer / essay questions
 * @property {'gemini'|'mock'} _engine    - Which engine produced this result
 */

/**
 * @typedef {Object} GenerateTestResponse
 * @property {boolean} success            - Whether generation succeeded
 * @property {GeneratedTest} [data]       - The generated test (on success)
 * @property {string} [error]             - Error message (on failure)
 * @property {Object} [meta]              - Response metadata
 * @property {string} meta.engine         - 'gemini' or 'mock'
 * @property {string} meta.generatedAt    - ISO timestamp
 * @property {Object} meta.questionCount  - Count per type
 */

// ── Future Expansion Hooks ───────────────────────────────────────────
// These types are defined for future phases. Do NOT implement yet.

/**
 * @typedef {Object} PDFParseResult
 * @property {string} text                - Extracted text
 * @property {number} pageCount           - Number of pages
 * @property {string} [chapterFiltered]   - Chapter-filtered text if applicable
 */

/**
 * @typedef {Object} RAGChunk
 * @property {string} content             - Chunk text content
 * @property {number} relevanceScore      - Similarity score (0-1)
 * @property {string} sourceFile          - Origin file path
 * @property {number} [pageNumber]        - Source page if from PDF
 */

/**
 * @typedef {Object} TestRecord
 * @property {string} id                  - Unique test ID
 * @property {string} title               - Test title
 * @property {GeneratedTest} content      - Generated test data
 * @property {string} createdAt           - Creation timestamp
 * @property {string} createdBy           - Creator user ID
 * @property {'draft'|'published'} status - Test status
 */

export default {}
