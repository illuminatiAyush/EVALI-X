const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log("Fetching tests...");
  const { data: tests, error } = await supabase.from('tests').select('id, title, status, start_time, end_time, created_at').limit(10);
  console.log("Tests:", tests);

  console.log("\nFetching attempts...");
  const { data: attempts } = await supabase.from('attempts').select('id, test_id, student_id, status').limit(10);
  console.log("Attempts:", attempts);
}

debug();
