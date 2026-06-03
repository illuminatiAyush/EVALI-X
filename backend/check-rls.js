const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL.replace('https', 'postgres');
  const client = new Client({ connectionString });
  
  try {
      await client.connect();
      const res = await client.query(`
        SELECT pol.polname, pol.polcmd, pol.polqual, pol.polwithcheck
        FROM pg_policy pol
        JOIN pg_class tbl ON pol.polrelid = tbl.oid
        WHERE tbl.relname = 'tests';
      `);
      console.log('RLS Policies for tests:');
      console.table(res.rows);
  } catch(e) {
      console.error(e.message);
  } finally {
      await client.end();
  }
}
run();
