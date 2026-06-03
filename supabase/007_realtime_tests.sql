-- ═══════════════════════════════════════════════════════════════════
-- 007: Enable Supabase Realtime on the `tests` table
-- This allows students to receive live updates when a teacher
-- starts, ends, or restarts an assessment — no page reload needed.
-- ═══════════════════════════════════════════════════════════════════

-- Enable realtime for the tests table
ALTER PUBLICATION supabase_realtime ADD TABLE tests;

-- Set REPLICA IDENTITY to FULL so UPDATE events include both old and new values
-- This allows the frontend to detect exactly what changed (e.g., status transitions)
ALTER TABLE tests REPLICA IDENTITY FULL;

-- Also enable realtime for test_batches (already listening for INSERTs)
ALTER PUBLICATION supabase_realtime ADD TABLE test_batches;
ALTER TABLE test_batches REPLICA IDENTITY FULL;
