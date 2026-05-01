<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/brain-circuit.svg" width="80" height="80" alt="EvaliX Logo" />
  <h1>EvaliX AI</h1>
  <p><strong>Next-Generation AI-Powered Assessment Platform</strong></p>
  <p>An intelligent, hybrid-architecture testing platform that dynamically generates assessments from PDF syllabuses, enforces strict anti-cheat protocols, and provides instantaneous analytics for both educators and students.</p>
</div>

---

## 📖 Comprehensive Project Overview

**EvaliX AI** is a specialized, standalone assessment engine originally extracted from the core of the *IntelliX* project. It was engineered specifically to solve the bottleneck of manual exam creation for educators by leveraging the raw power of Large Language Models (LLMs).

### The Problem It Solves
Traditionally, teachers spend hours drafting multiple-choice questions, determining difficulty levels, and ensuring syllabus alignment. Existing AI tools often hallucinate or generate generic questions. Furthermore, evaluating students remotely introduces massive vulnerabilities regarding cheating and tab-switching.

### The EvaliX Solution
EvaliX is a **closed-loop educational ecosystem**. 
1. **Ingestion**: A teacher uploads their exact syllabus or study material (PDFs/Text).
2. **AI Processing**: The Fastify backend extracts the raw text and dynamically prompts **Groq (Llama-3)** or **Google Gemini** to generate a highly specific, deterministic JSON array of questions, complete with difficulty levels and durations.
3. **Distribution**: The test is pushed to a secure PostgreSQL database. Teachers group students into "Batches" and assign the tests.
4. **Execution & Anti-Cheat**: Students log in, join a batch via an invite code, and take the test in a locked-down, distraction-free UI. The EvaliX proctoring engine monitors their browser visibility; if they attempt to search for answers in another tab, the system records a violation and forcefully submits their exam.
5. **Instant Analytics**: Upon completion, the system instantly auto-grades the exam, providing the student with their score and feeding aggregate analytics (class averages, total attempts) back to the teacher's dashboard.

---

## 🏗️ Architecture Overview

EvaliX utilizes a modern **Hybrid Architecture** designed to maximize security, prevent browser memory leaks, and securely process heavy AI generation tasks without exposing private keys.

| Layer | Technology | Primary Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | Handles high-performance routing, animations (Framer Motion), state management, and real-time anti-cheat monitoring on the client side. |
| **Backend** | Node.js + Fastify | A dedicated server responsible for parsing heavy PDF files, orchestrating requests to Large Language Models (LLMs), and securely storing API keys. |
| **Database & Auth** | Supabase (PostgreSQL) | Handles robust JWT session management, strictly enforced Row Level Security (RLS) policies, and instantaneous data fetching. |

---

## ✨ Core Features

| Feature | User Role | Description |
| :--- | :---: | :--- |
| **AI Assessment Generation** | 👨‍🏫 Teacher | Upload any PDF or text syllabus. The backend securely parses the document and pipes it into an LLM (Groq Llama-3 / Google Gemini) to generate deterministic, curriculum-aligned tests. |
| **Batch Management** | 👨‍🏫 Teacher | Create unique "Class Batches" and generate invite codes to securely onboard students into specific testing cohorts. |
| **Real-Time Analytics** | 👨‍🏫 Teacher | Monitor class averages, individual student scores, and identify specific knowledge gaps based on MCQ accuracy. |
| **Dynamic Dashboard** | 🎓 Student | View assigned assessments, active tests, and historical performance metrics. |
| **Secure Testing UI** | 🎓 Student | A highly optimized testing interface equipped with countdown timers, auto-submission logic, and zero-distraction UI. |

---

## 🛡️ Anti-Cheat Engine (Proctoring)

The frontend enforces strict testing integrity through a multi-layered proctoring system:

| Security Mechanism | Trigger | Action Taken |
| :--- | :--- | :--- |
| **Visibility Listener** | User switches tabs, opens a new window, or minimizes the browser during an active test. | Instantly pings the backend `attempts` table to record a strict visibility violation. |
| **Forced Submission** | User accumulates repeated visibility violations (ignoring warnings). | Automatically locks the student out of the test and forcefully submits their current progress. |

---

## 🛠️ Tech Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, Vite | High-performance SPA with strict-mode hydration. |
| **Styling & UI** | TailwindCSS, Framer Motion | Premium, accessible, dark/light mode SaaS design. |
| **Backend Server** | Node.js, Fastify | High-throughput API server with `multipart/form-data` support. |
| **Database & Auth** | Supabase, PostgreSQL | Relational data, RLS security, and session management. |
| **AI Inference** | Groq (Llama-3), Gemini | Ultra-fast LLMs for generating diverse question banks. |
| **PDF Processing** | `pdf-parse` (Node) | Server-side text extraction to prevent client-side memory leaks. |

---

## 💻 Local Development Setup

To run EvaliX locally, you must spin up both the Frontend and Backend servers simultaneously.

### 1. Clone the Repository
```bash
git clone https://github.com/illuminatiAyush/EVALI-X.git
cd EVALI-X
```

### 2. Configure Environment Variables
You will need two separate `.env` files to maintain strict separation of concerns.

| Variable Name | Environment | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | `backend/.env` | `3001` | The local port the Fastify server runs on. |
| `FRONTEND_URL` | `backend/.env` | `http://localhost:5173` | Allowed origin for CORS headers. |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | `sb_secret_...` | 🚨 Secret admin key to bypass RLS. **Never expose this to the frontend.** |
| `GROQ_API_KEY` | `backend/.env` | `gsk_...` | LLM token for fast Llama-3 inference. |
| `GEMINI_API_KEY` | `backend/.env` | `AIzaSy...` | Fallback LLM token for Google Gemini. |
| `VITE_SUPABASE_URL` | Both | `https://*.supabase.co` | Your Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env` | `eyJhbG...` | Public key for frontend client initialization. |
| `VITE_BACKEND_URL` | `frontend/.env` | `http://localhost:3001/api` | The URL pointing to your Fastify API server. |

### 3. Start the Backend
```bash
cd backend
npm install
node server.js
```
*(The backend will start running on `http://localhost:3001`)*

### 4. Start the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*(The frontend will start running on `http://localhost:5173`)*

---

## 🚀 Production Deployment Guide

Deploying EvaliX requires hosting the Frontend and Backend separately to ensure optimal performance.

### Step 1: Deploy Backend to Render.com
EvaliX includes a built-in `render.yaml` Blueprint file for automated, 1-click backend deployment.

| Step | Instruction |
| :---: | :--- |
| **1** | Push your code to GitHub. |
| **2** | Go to [Render.com](https://render.com) > **New +** > **Blueprint**. |
| **3** | Connect your repository. Render will automatically detect the Node.js environment, set the root directory to `backend/`, and prompt you to input your secure API keys. |
| **4** | *Note on Free Tier*: Render spins down free servers after 15 minutes of inactivity. To keep your server awake 24/7, set up a free ping schedule on [cron-job.org](https://cron-job.org) targeting your new Render URL every 10 minutes. |

### Step 2: Deploy Frontend to Vercel

| Step | Instruction |
| :---: | :--- |
| **1** | Go to [Vercel.com](https://vercel.com) > **Add New Project**. |
| **2** | Connect your repository. |
| **3** | 🚨 **CRITICAL**: In the configuration settings, change the **Root Directory** from `/` to `frontend/`. |
| **4** | Add your Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and set `VITE_BACKEND_URL` to your live Render URL (e.g., `https://evalix-backend.onrender.com/api`). |
| **5** | Click **Deploy**. |

### Step 3: Configure CORS
To allow your live Vercel frontend to talk to your live Render backend:
- Go back to your Render Dashboard > Environment Variables.
- Update the `FRONTEND_URL` variable to match your live Vercel URL (e.g., `https://evalix.vercel.app`).

---

## 🦠 Known Issues & Debugging

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Infinite Loading on Localhost** | Overlapping Vite Hot-Module Replacements (HMR) locking up `localStorage` during development. | EvaliX has been specifically patched to use a custom `evalix-auth-token` to prevent this. If you encounter it, manually clear your browser's application cache. |
| **Backend File Size Limits** | The Fastify backend currently restricts massive PDF uploads to prevent memory overload. | Ensure uploaded syllabuses are concise and text-heavy. |

---

## 👨‍💻 Creator & License
Designed and Developed by **zoKer** (Master of Mischief & Infrastructure).
- Support & Inquiries: [support@evalix.ai](mailto:support@evalix.ai)
