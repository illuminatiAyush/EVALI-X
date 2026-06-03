const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Testing Realtime as Service Role...');
  let received = false;
  
  const channel = supabase.channel('backend-test')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tests' }, (payload) => {
      console.log('RECEIVED REALTIME PAYLOAD:', payload.new.status);
      received = true;
    })
    .subscribe(async (status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
          // Fetch any test to update
          const { data: test } = await supabase.from('tests').select('id, status').limit(1).single();
          if (!test) {
              console.log('No tests found to update');
              process.exit(0);
          }
          console.log(`Updating test ${test.id} status from ${test.status} to itself...`);
          // Update status to the same thing to trigger an update (or change it and change it back)
          const newStatus = test.status === 'draft' ? 'scheduled' : 'draft';
          
          await supabase.from('tests').update({ status: newStatus }).eq('id', test.id);
          console.log('Update executed in DB');
          
          setTimeout(async () => {
              if(!received) console.log('FAILED: No broadcast received after 3 seconds');
              // revert
              await supabase.from('tests').update({ status: test.status }).eq('id', test.id);
              process.exit(0);
          }, 3000);
      }
    });
}
run();
