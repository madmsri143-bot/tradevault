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
  // Demote saturated gold
  { p: /#D4AF37/g, r: '#C9A646' },
  
  // Demote cards to dark neutral
  { p: /bg-zinc-900/g, r: 'bg-[#111827]' },
  { p: /bg-zinc-950/g, r: 'bg-[#1F2937]' },
  // Remove shadows that are too strong
  { p: /shadow-\[0_4px_20px_rgba\(0,0,0,0\.2\)\]/g, r: 'shadow-sm' },
  { p: /shadow-\[0_4px_20px_rgba\(0,0,0,0\.5\)\]/g, r: 'shadow-md' },

  // Primary text to #E5E7EB, Secondary to #9CA3AF
  { p: /text-white/g, r: 'text-[#E5E7EB]' },
  { p: /text-zinc-400/g, r: 'text-[#9CA3AF]' },
  { p: /text-zinc-500/g, r: 'text-[#9CA3AF]' },
  { p: /text-zinc-300/g, r: 'text-[#E5E7EB]' },
  
  // Borders to subtle gold or gray
  { p: /border-white\/10/g, r: 'border-[#111827]' },
  { p: /border-white\/5/g, r: 'border-[#111827]' },
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
      }
    }
  });
});
