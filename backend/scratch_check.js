const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const userId = '63177771-ee36-4deb-8e1e-d1a7a5b4d602'; // The teacher ID from the logs

  const { data, error } = await supabase.rpc('get_teacher_dashboard_stats', {
    p_teacher_id: userId
  });
  console.log('RPC Output:', data);
  console.log('RPC Error:', error);
}

check();
