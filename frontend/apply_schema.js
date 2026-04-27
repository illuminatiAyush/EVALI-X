
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const schemaFiles = [
  '001_profiles.sql',
  '002_tests.sql',
  '003_production_schema.sql',
  '004_batch_system.sql',
  '005_production_hardening.sql'
];

async function applySchema() {
  for (const file of schemaFiles) {
    console.log(`Applying ${file}...`);
    const filePath = path.join(process.cwd(), 'supabase', file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolons for basic execution if needed, 
    // but RPC might be better if available. 
    // However, the best way to run raw SQL is the 'sql' endpoint which 
    // requires service role but isn't directly exposed in supabase-js easily for raw strings.
    // We'll use the execute_sql equivalent if we can or just try to run it.
    
    // Since supabase-js doesn't have a direct 'runRawSql' method, 
    // we'll use a fetch to the SQL API.
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        // Fallback: try direct SQL endpoint if it exists
        const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: sql }) // This is a guess for some proxy setups
        });
        
        console.error(`Error applying ${file}: ${response.statusText}`);
        const error = await response.text();
        console.error(error);
    } else {
      console.log(`Successfully applied ${file}`);
    }
  }
}

applySchema();
