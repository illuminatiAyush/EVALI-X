/**
 * Logger — Structured logging with Pino
 */

const pino = require('pino');

// Pino config for Fastify
const pinoConfig = {
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
  level: process.env.LOG_LEVEL || 'info',
};

// Standalone logger for services (outside of request context)
const logger = pino(pinoConfig);

module.exports = { pinoConfig, logger };
