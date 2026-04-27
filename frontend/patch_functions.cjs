const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/kirti/Downloads/evalix/evalix/frontend/supabase/functions';

fs.readdirSync(dir).forEach(subdir => {
  const file = path.join(dir, subdir, 'index.ts');
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(
      /await supabase\.auth\.getUser\(\);/g, 
      "await supabase.auth.getUser(authHeader.replace('Bearer ', ''));"
    );
    fs.writeFileSync(file, content);
  }
});
console.log('Patched all edge functions!');
