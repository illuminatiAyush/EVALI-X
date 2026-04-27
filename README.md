# EvaliX AI — Core Engine & Frontend

> The standalone AI-powered test generation engine extracted from IntelliX, featuring a completely serverless backend (Supabase) and a React/Vite frontend.

## 🚀 Quick Start

```bash
cd frontend
npm install
cp .env.example .env.local    # Add your Supabase and AI API Keys
npm run dev                   # Starts Vite dev server on http://localhost:3100
```

## 🏗️ Architecture

**Frontend**: React + Vite + TailwindCSS. Uses Framer Motion for animations and Lucide React for iconography. Features a highly optimized, dark-mode first UI.
**Backend**: 100% Serverless via **Supabase**.
- Uses PostgreSQL with strict Row Level Security (RLS) for data isolation between Teachers and Students.
- Migrated all critical paths (Test Creation, Attempt Submission, Telemetry) to direct Supabase JS Client calls for maximum stability and zero dropped data.
- Built-in Supabase Authentication for secure, session-based user management.

## 🧠 AI Engine
Evalix extracts text directly from PDFs natively in the browser and pipes it into an AI generation engine.
Supports **Groq Llama 3** for hyper-fast inference and falls back to **Google Gemini** for fallback resilience. Generates deterministic MCQs, short answers, and long answers directly from your custom syllabus material.

## 🛡️ Anti-Cheat System
The frontend implements a `visibilitychange` listener in the `TestAttemptPage`. Navigating away from the test tab automatically pings the backend `attempts` table to record a violation. Repeated violations trigger an automatic forced submission of the exam to ensure testing integrity.

## 👨‍💻 Creator
**zoKer**: Visionary Developer & Architect of EvaliX AI.
- Support: [support@evalix.ai](mailto:support@evalix.ai)
