/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  EVALIX BACKEND — Fastify Server                               ║
 * ║  Hybrid Architecture: Backend handles AI + PDF + Business Logic ║
 * ║  Phase 1: Production Hardened (Zod + Rate Limit + Timer)        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

require('dotenv').config();
const fastify = require('fastify');
const cors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const rateLimit = require('@fastify/rate-limit');
const logger = require('./utils/logger');

const app = fastify({
  logger: logger.pinoConfig,
  bodyLimit: 10 * 1024 * 1024, // 10MB — handles large JSON payloads
});

// ─── Plugins ─────────────────────────────────────────────────────
async function start() {
  // CORS — allow frontend origin
  await app.register(cors, {
    origin: true, // Reflects the origin of the request, allowing localhost, 127.0.0.1, and network IPs

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Rate Limiting — global default (60 req/min per IP)
  await app.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Use JWT user ID if available, otherwise fall back to IP
      return request.user?.id || request.ip;
    },
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: 'Rate limit exceeded. Please wait before retrying.',
      retryAfter: Math.ceil(context.ttl / 1000),
    }),
  });

  // Multipart — for file uploads (PDF)
  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB max PDF
      files: 1,                    // Single file per request
    },
  });

  // Start Background Workers
  require('./workers/testWorker');

  // ─── Routes ──────────────────────────────────────────────────────
  app.register(require('./routes/aiRoutes'), { prefix: '/api' });
  app.register(require('./routes/testRoutes'), { prefix: '/api' });
  app.register(require('./routes/attemptRoutes'), { prefix: '/api' });

  // ─── Health Check ────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'evalix-backend',
    version: '1.1.0-hardened',
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
    console.log(`\n  ⚡ Evalix Backend v1.1.0 (Hardened) running on http://localhost:${port}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
