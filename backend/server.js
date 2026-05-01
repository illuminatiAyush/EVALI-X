/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  EVALIX BACKEND — Fastify Server                               ║
 * ║  Hybrid Architecture: Backend handles AI + PDF + Business Logic ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

require('dotenv').config();
const fastify = require('fastify');
const cors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const logger = require('./utils/logger');

const app = fastify({
  logger: logger.pinoConfig,
  bodyLimit: 10 * 1024 * 1024, // 10MB — handles large JSON payloads
});

// ─── Plugins ─────────────────────────────────────────────────────
async function start() {
  // CORS — allow frontend origin
  await app.register(cors, {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'https://evali-x.vercel.app',  // production frontend
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Multipart — for file uploads (PDF)
  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB max PDF
      files: 1,                    // Single file per request
    },
  });

  // ─── Routes ──────────────────────────────────────────────────────
  app.register(require('./routes/aiRoutes'), { prefix: '/api' });
  app.register(require('./routes/testRoutes'), { prefix: '/api' });
  app.register(require('./routes/attemptRoutes'), { prefix: '/api' });

  // ─── Health Check ────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'evalix-backend',
    timestamp: new Date().toISOString(),
  }));

  // ─── Global Error Handler ────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Unhandled error');

    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      success: false,
      error: statusCode === 500 ? 'Internal server error' : error.message,
    });
  });

  // ─── Start ───────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`\n  ⚡ Evalix Backend running on http://localhost:${port}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
