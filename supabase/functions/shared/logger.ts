import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ═══════════════════════════════════════════════════════════════
// PHASE 3: Enhanced Structured Logger
// ═══════════════════════════════════════════════════════════════

interface LogContext {
  user_id?: string;
  role?: string;
  ip_address?: string;
}

export function log(
  level: string,
  functionName: string,
  message: string,
  meta: Record<string, any> = {},
  requestId: string = "unknown",
  context: LogContext = {}
) {
  let safeMeta: Record<string, any>;
  try {
    safeMeta = JSON.parse(JSON.stringify(meta, (_, value) => {
      if (value instanceof Error) {
        return { message: value.message, name: value.name };
      }
      return value;
    }));
  } catch {
    safeMeta = { _serialization_error: "Failed to serialize meta" };
  }

  console.log(JSON.stringify({
    request_id: requestId,
    function: functionName,
    level,
    message,
    user_id: context.user_id || null,
    role: context.role || null,
    ip_address: context.ip_address || null,
    meta: safeMeta,
    timestamp: new Date().toISOString(),
  }));
}

// ═══════════════════════════════════════════════════════════════
// Crypto-safe short code generator
// ═══════════════════════════════════════════════════════════════

export function generateShortCode(length: number = 4): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

// ═══════════════════════════════════════════════════════════════
// Safe error message (prevents internal detail leakage)
// ═══════════════════════════════════════════════════════════════

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.length > 200 || /\/(usr|etc|var|home|supabase)|postgres:|connection/i.test(msg)) {
      return "An internal error occurred";
    }
    return msg;
  }
  return "An internal error occurred";
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: Rate Limiter (user_id based, per action)
// ═══════════════════════════════════════════════════════════════

export async function checkRateLimit(
  adminClient: SupabaseClient,
  userId: string,
  action: string,
  maxAttempts: number = 10,
  windowMinutes: number = 1
): Promise<{ allowed: boolean; count: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Count attempts within the window
  const { data, error } = await adminClient
    .from("rate_limits")
    .select("count")
    .eq("identifier", userId)
    .eq("action", action)
    .gte("window_start", windowStart);

  const totalCount = (data || []).reduce((sum, row) => sum + (row.count || 1), 0);

  if (totalCount >= maxAttempts) {
    return { allowed: false, count: totalCount };
  }

  // Record this attempt
  await adminClient
    .from("rate_limits")
    .insert({ identifier: userId, action, count: 1, window_start: new Date().toISOString() });

  return { allowed: true, count: totalCount + 1 };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: Audit Event Logger
// ═══════════════════════════════════════════════════════════════

export async function logAuditEvent(
  adminClient: SupabaseClient,
  type: string,
  actorId: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    await adminClient
      .from("batch_events")
      .insert({ type, actor_id: actorId, metadata });
  } catch (err) {
    // Audit logging should never crash the main operation
    console.error("Failed to log audit event:", err);
  }
}

// ═══════════════════════════════════════════════════════════════
// Extract client IP from request headers
// ═══════════════════════════════════════════════════════════════

export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
