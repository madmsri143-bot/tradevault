const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!['node_modules', '.git', '.next'].includes(f)) {
        walk(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const replacements = [
  // Branding Cyan -> Soft Gold
  { p: /#00FFB2/g, r: '#C9A646' },
  { p: /rgba\(0,\s*255,\s*178/g, r: 'rgba(201,166,70' },

  // Heavy filled gold buttons -> dark with soft outline
  { p: /bg-\[#C9A646\] text-black/g, r: 'bg-[#111827] border border-[#C9A646]/50 text-[#C9A646] hover:bg-[#C9A646]/10' },

  // Glowing shadows reduction
  { p: /shadow-\[0_0_20px_rgba\(201,166,70,0\.4\)]/g, r: 'shadow-[0_0_10px_rgba(201,166,70,0.15)]' },
  { p: /shadow-\[0_0_30px_rgba\(201,166,70,0\.15\)]/g, r: 'shadow-[0_0_10px_rgba(201,166,70,0.1)]' },
  
  // Specific Button.tsx primary
  { p: /bg-emerald-400 shadow-\[0_0_15px_rgba\(201,166,70,0\.2\)]/g, r: 'bg-[#C9A646]/10 shadow-[0_0_10px_rgba(201,166,70,0.1)]' },

  // Change bg-zinc-900 (cards mostly) to #111827 where strictly appropriate? Actually let's manually do that since it's global
];

['app', 'components'].forEach(dir => {
  walk(dir, file => {
    if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      let content = fs.readFileSync(file, 'utf8');
      let newContent = content;
      replacements.forEach(rep => {
        newContent = newContent.replace(rep.p, rep.r);
      });
      if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        console.log('Updated', file);
      }
    }
  });
});
