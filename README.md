# Evalix AI — Core Engine & Frontend

> The standalone AI-powered test generation engine extracted from IntelliX, featuring a completely decoupled backend and an isolated React/Vite frontend.

## Quick Start (Backend)

```bash
cd evalix/backend
npm install
cp .env.example .env    # Add your GEMINI_API_KEY and/or GROQ_API_KEY
npm run dev              # Starts Fastify server on http://localhost:4000
```

## Quick Start (Frontend)

```bash
cd evalix/frontend
npm install
npm run dev              # Starts Vite dev server on http://localhost:3100
```

## Architecture

**Backend**: Fastify API running on port 4000. Uses an in-memory `store/memoryStore.js` and `authMiddleware.js` (header-based). Provides AI generation endpoints.
**Frontend**: React + Vite + TailwindCSS. Configured with a proxy to `localhost:4000/api`. Handles session state and student testing interface with anti-cheat.

```
Frontend (Vite, React) → /api/generate-test → testGenerator.js → aiService.js
                                                   ↓
                                              In-Memory Store
```

## Anti-Cheat System
The frontend implements a `visibilitychange` listener in the `TestAttemptPage`. Navigating away from the test tab automatically pings the backend `/attempts/:id/violation` endpoint. Repeated violations auto-submit the exam to ensure testing integrity.
