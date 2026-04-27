# Evalix AI — Comprehensive Codebase Report

> **Generated**: 2026-04-26  
> **Purpose**: Full architectural breakdown for agent consumption — tech stack, features, user flows, file structure, database schema, API surface, and design system.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Name** | Evalix AI |
| **Tagline** | AI-Powered Assessment Engine |
| **Origin** | Extracted from a larger project called "IntelliX" |
| **Type** | Full-stack web application (Frontend-only codebase with serverless backend via Supabase) |
| **Domain** | EdTech — AI-driven test generation, student assessment, and analytics |

---

## 2. Tech Stack

### Frontend

| Layer | Technology | Version |
|---|---|---|
| **Framework** | React | ^18.2.0 |
| **Build Tool** | Vite | ^5.1.0 |
| **Styling** | TailwindCSS | ^3.4.1 |
| **Routing** | React Router DOM | ^6.22.0 |
| **Animations** | Framer Motion | ^11.0.0 |
| **Icons** | Lucide React | ^0.330.0 |
| **Toasts** | Sonner | ^2.0.7 (also uses `react-hot-toast` in TestAttemptPage) |
| **PDF Parsing** | pdfjs-dist | ^5.6.205 |
| **PostCSS** | PostCSS + Autoprefixer | ^8.4.35 / ^10.4.17 |
| **Typography** | Google Fonts: Inter (body), Outfit (headings) | — |

### Backend (Serverless)

| Layer | Technology |
|---|---|
| **BaaS** | Supabase (PostgreSQL + Auth + Edge Functions + RLS) |
| **Auth** | Supabase Auth (email/password, role-based via `profiles` table) |
| **Database** | Supabase PostgreSQL with Row-Level Security (RLS) |
| **Serverless Functions** | Supabase Edge Functions (Deno runtime) |
| **AI Engine** | Gemini API / Groq Llama 3 (invoked via Supabase Edge Function `generate-test`) |

### Dev Tooling

| Tool | Purpose |
|---|---|
| **Vite** | Dev server on `localhost:3100` (or default Vite port) |
| **Graphify** | Codebase knowledge graph analysis (output in `graphify-out/`) |

---

## 3. Project Structure

```
evalix/
├── .gitignore
├── README.md
├── report.md                          ← This file
├── shared/
│   └── types.js                       ← JSDoc type definitions (request/response shapes)
├── graphify-out/                      ← Code graph analysis output
│   ├── GRAPH_REPORT.md
│   ├── graph.json
│   ├── graph.html
│   └── cache/
└── frontend/
    ├── .env                           ← Active environment config
    ├── .env.local                     ← Supabase credentials (gitignored)
    ├── .env.local.example             ← Template for .env.local
    ├── SETUP_GUIDE.md                 ← Supabase credential setup instructions
    ├── index.html                     ← Vite entry HTML
    ├── package.json                   ← NPM manifest
    ├── vite.config.js                 ← Vite configuration
    ├── tailwind.config.js             ← Tailwind theme extension
    ├── postcss.config.js              ← PostCSS plugins
    ├── dist/                          ← Production build output
    ├── public/                        ← Static assets (pdf.worker.min.mjs)
    ├── supabase/                      ← Database migration SQL files
    │   ├── 001_profiles.sql
    │   ├── 002_tests.sql
    │   └── 003_production_schema.sql  ← Full production schema with RLS
    └── src/
        ├── main.jsx                   ← React root mount
        ├── App.jsx                    ← Router + Auth provider setup
        ├── index.css                  ← Global styles, CSS variables, fonts
        ├── context/
        │   └── AuthContext.jsx        ← Auth state management (Supabase session)
        ├── components/
        │   └── ProtectedRoute.jsx     ← Role-based route guard
        ├── layouts/
        │   └── MainLayout.jsx         ← Sidebar + header shell for dashboard pages
        ├── lib/
        │   ├── api.js                 ← API service layer (Supabase Edge Function calls)
        │   ├── supabase.js            ← Supabase client initialization + timeout wrapper
        │   └── pdfExtractor.js        ← Client-side PDF text extraction
        ├── pages/
        │   ├── LandingPage.jsx        ← Public marketing landing page
        │   ├── AuthPage.jsx           ← Login / Signup page (role selection)
        │   ├── teacher/
        │   │   ├── TeacherDashboard.jsx    ← Test list, stats, class performance
        │   │   ├── CreateTestPage.jsx      ← PDF upload → AI test generation
        │   │   ├── TestViewerPage.jsx      ← Review generated questions + schedule
        │   │   └── TestAnalyticsPage.jsx   ← Student performance analytics table
        │   └── student/
        │       ├── StudentDashboard.jsx    ← Available tests, stats, learning path
        │       ├── TestAttemptPage.jsx     ← Live test-taking UI + anti-cheat
        │       ├── TestResultsPage.jsx     ← Score card + AI feedback + breakdown
        │       └── StudentHistoryPage.jsx  ← Past attempt history list
        └── services/                  ← Empty directory (unused)
```

---

## 4. Database Schema (Supabase PostgreSQL)

All tables have **Row-Level Security (RLS) enabled**.

### Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User identity (linked to `auth.users`) | `id (UUID, PK, FK→auth.users)`, `name`, `email`, `role ('teacher'/'student')` |
| `batches` | Student grouping for test assignment | `id`, `name`, `created_by (FK→profiles)` |
| `student_batches` | Many-to-many: students ↔ batches | `student_id`, `batch_id` (unique pair) |
| `test_batches` | Many-to-many: tests ↔ batches | `test_id`, `batch_id` (unique pair) |
| `tests` | Assessment metadata | `id`, `title`, `prompt`, `difficulty`, `duration_minutes`, `start_time`, `end_time`, `status ('draft'/'scheduled'/'active'/'ended')`, `total_questions`, `created_by` |
| `questions` | Individual test questions | `id`, `test_id (FK→tests)`, `question`, `options (JSONB)`, `answer`, `type ('mcq'/'short'/'long')`, `sort_order` |
| `attempts` | Student test attempt sessions | `id`, `student_id`, `test_id`, `status ('in_progress'/'submitted'/'forced_end')`, `answers (JSONB)`, `ends_at`, unique(`student_id`, `test_id`) |
| `results` | Graded results with AI feedback | `id`, `attempt_id`, `student_id`, `test_id`, `marks`, `answers (JSONB)`, `ai_feedback (JSONB)`, unique(`attempt_id`) |

### RLS Policy Summary

| Role | Table | Access |
|---|---|---|
| **Teacher** | `tests` | Full CRUD on own tests |
| **Teacher** | `questions` | Full CRUD on questions of own tests |
| **Teacher** | `attempts` | SELECT on attempts for own tests |
| **Teacher** | `results` | SELECT on results for own tests |
| **Student** | `tests` | SELECT on assigned, active/scheduled tests (via batch membership) |
| **Student** | `questions` | SELECT on questions of active tests |
| **Student** | `attempts` | Full CRUD on own attempts |
| **Student** | `results` | SELECT on own results |

---

## 5. Authentication System

| Aspect | Detail |
|---|---|
| **Provider** | Supabase Auth (email/password) |
| **Role Storage** | `profiles.role` column (`'teacher'` or `'student'`) |
| **Profile Creation** | Triggered automatically on `auth.users` insert (Supabase trigger), role updated on signup |
| **Session Management** | `AuthContext.jsx` — React Context wrapping `supabase.auth.getSession()` + `onAuthStateChange` listener |
| **Route Protection** | `ProtectedRoute.jsx` — checks `user` and `role`, redirects unauthorized users |
| **Timeout Protection** | Supabase client wrapper adds 10-second timeout to auth requests |
| **Corrupted State Detection** | Detects `/null/` in URL path and redirects to `/login` |

---

## 6. API Surface (Supabase Edge Functions)

All API calls are made via `apiService` in `src/lib/api.js`, which invokes Supabase Edge Functions.

| Function Name | Action | Purpose |
|---|---|---|
| `generate-test` | — | Sends extracted PDF text + config → returns AI-generated questions |
| `create-test` | `create` | Saves a new test with questions to the database |
| `create-test` | `update` | Updates an existing test's metadata |
| `create-test` | `end` | Force-ends a test (all attempts auto-submitted) |
| `get-tests` | — | Lists all tests (teacher sees own, student sees assigned) |
| `get-tests` | `test_id` | Fetches a specific test by ID |
| `start-attempt` | `start` | Creates/resumes a test attempt for the student |
| `start-attempt` | `answer` | Saves an individual answer to an attempt |
| `start-attempt` | `violation` | Records a tab-switch violation |
| `submit-attempt` | — | Submits an attempt for grading (with reason: `completed`, `timeout`, `teacher_stopped`) |
| `get-results` | — | Fetches results (teacher: by test_id, student: own results) |

### Direct Supabase Queries (Client-Side, RLS-Protected)

| Method | Purpose |
|---|---|
| `getTeacherDashboardStats()` | Aggregates total attempts + class average from `results` + `tests` tables |
| `getStudentDashboardStats()` | Aggregates total attempts + avg accuracy + learning points from `results` |
| `getTestAttemptCounts()` | Counts attempts per test from `student_attempts` table |

---

## 7. Features

### Teacher Features

| Feature | Description |
|---|---|
| **AI Test Generation** | Upload a PDF → client-side text extraction → AI generates MCQ, short answer, and long answer questions |
| **Test Configuration** | Set difficulty (easy/medium/hard), question count (5–30), question types (MCQ/short/long) |
| **Test Viewer** | Review generated questions with highlighted correct answers and AI grading keys |
| **Test Scheduling** | Set start time, end time, and duration; publish as 'scheduled' |
| **Force-End Test** | End a live test immediately, triggering auto-submission for all active attempts |
| **Analytics Dashboard** | View per-student scores, accuracy bars, violation counts, and overall stats |
| **Dashboard Stats** | Total generated tests, total attempts, class average percentage |

### Student Features

| Feature | Description |
|---|---|
| **Available Tests** | Browse scheduled/active tests assigned to the student |
| **Test Attempt** | Full-screen test-taking experience with one question at a time, progress bar, and question map |
| **Timer** | Countdown timer with visual urgency at <60 seconds (red pulsing) |
| **Answer Persistence** | Answers saved to backend immediately on selection/blur |
| **Auto-Submit** | Triggered on timeout, excessive violations, or teacher force-end |
| **Results View** | Score card with percentage, pass/fail, violation count, and per-question breakdown |
| **AI Feedback** | Strengths, weak topics, and overall summary generated by AI |
| **History** | List of all past attempts with scores and dates |
| **Learning Points** | Gamification: `(attempts × 50) + sumPercentage` |

### Anti-Cheat System

| Mechanism | Detail |
|---|---|
| **Tab Switch Detection** | `visibilitychange` listener records violations via API |
| **Violation Threshold** | 3 violations → automatic test submission |
| **Warning Modal** | Full-screen warning overlay on tab switch |
| **Teacher Force-End Polling** | Student page polls test status every 5 seconds; auto-submits if teacher ends test |

---

## 8. User Flows

### Flow 1: Teacher Creates a Test

```
Landing Page → Login (role=teacher)
  → Teacher Dashboard
  → "Create New Test" button
  → CreateTestPage:
      1. Upload PDF (drag-and-drop or browse)
      2. Configure: difficulty, question count, question types
      3. Click "Generate Assessment"
      4. Client extracts text from PDF (pdfjs-dist)
      5. Text sent to Supabase Edge Function `generate-test`
      6. AI generates structured questions
      7. Test + questions saved to database via `create-test`
      8. Redirect to TestViewerPage
  → TestViewerPage:
      1. Review MCQ and subjective questions
      2. Click "Schedule Test"
      3. Set duration, start time, end time
      4. Confirm → test status = 'scheduled'
  → Teacher Dashboard (see test listed)
  → TestAnalyticsPage (view student results after attempts)
```

### Flow 2: Student Takes a Test

```
Landing Page → Login (role=student)
  → Student Dashboard
      - View available tests (status=scheduled/active, within time window)
      - View stats (attempts, accuracy, learning points)
  → Click "Take Test"
  → TestAttemptPage:
      1. Attempt created via `start-attempt`
      2. Timer starts (countdown to `ends_at`)
      3. Navigate questions one-by-one
      4. Select MCQ option or type text answer
      5. Answers saved immediately to backend
      6. Anti-cheat monitors tab switches
      7. Click "Finish & Submit" on last question
      8. Redirect to TestResultsPage
  → TestResultsPage:
      - View score percentage, marks, pass/fail
      - View per-question breakdown (correct/incorrect)
      - View AI-generated performance insights
  → Student History Page (all past results)
```

### Flow 3: Authentication

```
/ (Landing) → /login (AuthPage)
  - Toggle Login / Signup
  - On Signup: select role (student/teacher)
  - Email + password → Supabase Auth
  - Profile role fetched from `profiles` table
  - Redirect: /teacher/dashboard or /student/dashboard
  - Session persisted via Supabase token
```

---

## 9. Routing Map

| Path | Component | Access |
|---|---|---|
| `/` | `LandingPage` | Public (redirects to dashboard if logged in) |
| `/login` | `AuthPage` | Public (redirects to dashboard if logged in) |
| `/teacher/dashboard` | `TeacherDashboard` | Teacher only |
| `/teacher/create-test` | `CreateTestPage` | Teacher only |
| `/teacher/test/:id` | `TestViewerPage` | Teacher only |
| `/teacher/analytics/:id` | `TestAnalyticsPage` | Teacher only |
| `/student/dashboard` | `StudentDashboard` | Student only |
| `/student/test/:id` | `TestAttemptPage` | Student only |
| `/student/results/:id` | `TestResultsPage` | Student only |
| `/student/history` | `StudentHistoryPage` | Student only |
| `*` | Redirect to `/` | Catch-all |

---

## 10. Design System

### Color Palette (Tailwind Config)

| Token | Value | Usage |
|---|---|---|
| `background` | `#ffffff` | Page background |
| `surface` | `#f9fafb` | Card/surface backgrounds |
| `primary` | `#3b82f6` | Buttons, links, active states |
| `primary-hover` | `#2563eb` | Button hover |
| `accent` | `#8b5cf6` | Accent purple |
| `border` | `#e5e7eb` | Borders |
| `text` | `#111827` | Primary text |
| `text-muted` | `#6b7280` | Secondary text |

### CSS Variables (index.css)

| Variable | Value |
|---|---|
| `--primary` | `#2563EB` |
| `--secondary` | `#4F46E5` |
| `--accent` | `#10B981` |
| `--background` | `#F8FAFC` |
| `--surface` | `#FFFFFF` |
| `--text` | `#0F172A` |
| `--text-muted` | `#64748B` |
| `--border` | `#E2E8F0` |

### Typography

- **Body**: `Inter` (weights 300–800)
- **Headings**: `Outfit` (weights 400–800, letter-spacing: -0.02em)

### Design Patterns

- **Border Radius**: Heavy use of `rounded-2xl` (1rem), `rounded-3xl`, `rounded-[40px]`
- **Shadows**: Soft colored shadows (`shadow-blue-100`, `shadow-slate-200`)
- **Glassmorphism**: `.glass` utility class for frosted-glass navbar
- **Animations**: `animate-float`, `shimmer` effect, Framer Motion entrance animations
- **Layout**: Sidebar (72px/288px) + header (80px) + scrollable main content

---

## 11. Environment Variables

| Variable | File | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` | Supabase anonymous/public key |
| `VITE_SUPABASE_FUNCTION_URL` | `.env.local` | (Optional) Edge function base URL |

---

## 12. Key Architectural Decisions

1. **No traditional backend server**: The entire backend is serverless via Supabase (Edge Functions + PostgreSQL + Auth). No Express/Fastify server is deployed.
2. **Client-side PDF processing**: PDF text extraction happens in the browser using `pdfjs-dist`, avoiding server-side file uploads.
3. **Edge Functions for AI**: The AI generation logic (Gemini/Groq) runs inside Supabase Edge Functions, keeping API keys server-side.
4. **RLS for security**: All data access is controlled via PostgreSQL Row-Level Security policies — no custom middleware needed.
5. **Single-attempt enforcement**: The `attempts` table has a `UNIQUE(student_id, test_id)` constraint, preventing retakes.
6. **Real-time answer saving**: Each answer is saved to the backend immediately, preventing data loss on disconnection.
7. **Polling for teacher control**: Students poll the test status every 5 seconds to detect teacher force-end events (not WebSocket-based).

---

## 13. Shared Types (Reference)

Defined in `shared/types.js` using JSDoc (not runtime-enforced):

| Type | Purpose |
|---|---|
| `GenerateTestRequest` | `{ prompt, difficulty, types, numQuestions }` |
| `MCQQuestion` | `{ question, options[4], answer('A'/'B'/'C'/'D'), sort_order }` |
| `TextQuestion` | `{ question, answer, sort_order }` |
| `GeneratedTest` | `{ mcqs[], shortAnswers[], longAnswers[], _engine }` |
| `GenerateTestResponse` | `{ success, data, error, meta }` |
| `PDFParseResult` | *(Future)* `{ text, pageCount, chapterFiltered }` |
| `RAGChunk` | *(Future)* `{ content, relevanceScore, sourceFile, pageNumber }` |
| `TestRecord` | *(Future)* `{ id, title, content, createdAt, createdBy, status }` |

---

## 14. Known Issues & Gaps

| Issue | Detail |
|---|---|
| **Toast library inconsistency** | `LandingPage` and most pages use `sonner`, but `TestAttemptPage` imports `react-hot-toast` |
| **Hardcoded pass rate** | `TestAnalyticsPage` displays `85%` pass rate as a static value |
| **Login redirect heuristic** | `AuthPage` determines redirect by checking if email contains 'teacher' — fragile logic |
| **Empty services directory** | `src/services/` exists but contains no files |
| **No backend in repo** | The README references `backend/` directory with Fastify, but the actual codebase has migrated to Supabase Edge Functions only; no backend source is present |
| **Batch assignment UI missing** | Database schema supports batch-based test assignment, but no UI exists for managing batches |
| **Search not functional** | Header search bar and analytics search are visual-only (no filtering logic) |
| **PDF export not implemented** | "Download PDF" and "Export Report" buttons are non-functional placeholders |
| **Notifications not implemented** | Bell icon with badge in header is visual-only |
| **Settings page missing** | Settings icon in header has no route or page |

---

## 15. Future Expansion Hooks (Defined in types.js)

| Feature | Status |
|---|---|
| **PDF chapter filtering** | Type defined (`PDFParseResult.chapterFiltered`), not implemented |
| **RAG (Retrieval-Augmented Generation)** | Type defined (`RAGChunk`), not implemented |
| **Test record management** | Type defined (`TestRecord`), partially implemented via database |

---

## 16. Running the Project

### Prerequisites
- Node.js (v18+)
- Supabase project with Edge Functions deployed

### Frontend
```bash
cd evalix/frontend
npm install
cp .env.local.example .env.local    # Add Supabase credentials
npm run dev                          # Starts on http://localhost:5173
```

### Required Supabase Setup
1. Create a Supabase project
2. Run SQL migrations from `supabase/003_production_schema.sql`
3. Deploy Edge Functions: `generate-test`, `create-test`, `get-tests`, `start-attempt`, `submit-attempt`, `get-results`
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
