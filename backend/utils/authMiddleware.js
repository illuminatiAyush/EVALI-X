/**
 * Auth Middleware — JWT Validation
 * 
 * Extracts the Bearer token from the Authorization header,
 * validates it against Supabase, and attaches the user to the request.
 * 
 * Usage in routes:
 *   fastify.addHook('preHandler', authenticate);
 */

const { getUserFromToken } = require('./supabaseClient');

async function authenticate(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { user, error } = await getUserFromToken(token);

  if (error || !user) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }

  // Attach user to request for downstream handlers
  request.user = user;
}

module.exports = { authenticate };
