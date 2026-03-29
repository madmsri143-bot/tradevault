const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!['node_modules', '.git', '.next', 'billing'].includes(f)) {
        walk(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const premiumShadow = 'shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]';
const hoverEffects = 'hover:-translate-y-[2px] hover:border-[rgba(212,175,55,0.25)] hover:shadow-[0_8px_32px_rgba(212,175,55,0.1),inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-300';
const baseBorder = 'border border-[rgba(212,175,55,0.15)]'; // Added 'border' so we replace 'border border-X' with 'border border-Y'
const baseBg = 'bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md';

const replacements = [
  // Typography
  { p: /text-\[#E5E7EB\]/g, r: 'text-[#EAEAEA]' },
  { p: /text-\[#9CA3AF\]/g, r: 'text-[#A0A0A0]' },
  
  // Re-enable gold highlights (#D4AF37)
  { p: /#C9A646/g, r: '#D4AF37' },

  // Backgrounds - mapping #111827 and #1F2937 back to the luxury gradient
  { p: /bg-\[#111827\]/g, r: baseBg },
  { p: /bg-\[#1F2937\]/g, r: baseBg },
  
  // Custom Card Outlines
  { p: /border border-black\/10 dark:border-\[#111827\]/g, r: baseBorder },
  { p: /border border-\[#111827\]/g, r: baseBorder },
  { p: /border border-\[#1F2937\]/g, r: baseBorder },
  
  // Custom Card Shadows
  { p: /shadow-\[0_1px_2px_rgba\(0,0,0,0\.05\)\] dark:shadow-none/g, r: premiumShadow },
  { p: /shadow-sm dark:shadow-md/g, r: premiumShadow },
  
  // Complex hover transitions mapping to new standard
  { p: /hover:-translate-y-1 hover:border-emerald-500\/20/g, r: hoverEffects },
  { p: /hover:border-\[#111827\] transition-colors/g, r: hoverEffects },
  { p: /hover:border-\[rgba\(212,175,55,0\.15\)\]/g, r: hoverEffects },

  // Normalize rounded corners
  { p: /rounded-xl/g, r: 'rounded-2xl' }
];

['app', 'components'].forEach(dir => {
  walk(dir, file => {
    if (file.includes('billing')) return;
    
    if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      let content = fs.readFileSync(file, 'utf8');
      let newContent = content;
      replacements.forEach(rep => {
        // Special case safety: avoid mutating Button specifically handling shadows
        if (file.includes('Button.tsx') && rep.p.toString().includes('shadow')) return;
        newContent = newContent.replace(rep.p, rep.r);
      });
      if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        console.log('Updated ' + file);
      }
    }
  });
});
