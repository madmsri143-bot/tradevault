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
  // Typography
  { p: /text-\[#EAEAEA\]/g, r: 'text-zinc-900 dark:text-[#EAEAEA]' },
  { p: /text-\[#A0A0A0\]/g, r: 'text-zinc-600 dark:text-[#A0A0A0]' },
  { p: /text-\[rgba\(255,255,255,0\.5\)\]/g, r: 'text-zinc-500 dark:text-[rgba(255,255,255,0.5)]' },
  
  // Backgrounds - mapping the luxury gradient back to responsive modes
  // Ensure we don't duplicate if already replaced somehow
  { 
    p: /bg-gradient-to-b from-\[#0A0A0A\] to-\[#121212\] backdrop-blur-md/g, 
    r: 'bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md' 
  },
  { p: /bg-\[#0B0F14\]/g, r: 'bg-zinc-50 dark:bg-[#0B0F14]' }, 
  { p: /bg-\[#11161D\]/g, r: 'bg-white dark:bg-[#11161D]' }, 
  { p: /bg-\[#0A0A0A\]/g, r: 'bg-white dark:bg-[#0A0A0A]' }, 
  { p: /bg-\[#121212\]/g, r: 'bg-zinc-50 dark:bg-[#121212]' }, 
  
  // Custom Card Outlines
  { p: /border-\[rgba\(212,175,55,0\.15\)\]/g, r: 'border-zinc-200 dark:border-[rgba(212,175,55,0.15)]' },
  { p: /border-\[#111827\]/g, r: 'border-zinc-200 dark:border-[#111827]' },
  { p: /border-\[#27272a\]/g, r: 'border-zinc-200 dark:border-[#27272a]' },
  
  // Custom Card Shadows
  { p: /shadow-\[0_4px_24px_rgba\(0,0,0,0\.6\),inset_0_1px_0_rgba\(255,255,255,0\.02\)\]/g, r: 'shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]' },
  { p: /shadow-\[0_8px_32px_rgba\(0,0,0,0\.6\)\]/g, r: 'shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]' },

  // Special case colors needing inverse
  { p: /text-emerald-400([^/])/g, r: 'text-emerald-600 dark:text-emerald-400$1' },
  { p: /text-red-400([^/])/g, r: 'text-red-600 dark:text-red-400$1' },
  { p: /text-amber-400([^/])/g, r: 'text-amber-600 dark:text-amber-400$1' },
  
  // Inner Borders & elements
  { p: /bg-zinc-800/g, r: 'bg-zinc-200 dark:bg-zinc-800' }
];

['c:/Users/Madhis/.gemini/antigravity/scratch/trading-journal/app', 'c:/Users/Madhis/.gemini/antigravity/scratch/trading-journal/components'].forEach(dir => {
  walk(dir, file => {
    if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      let content = fs.readFileSync(file, 'utf8');
      
      // Prevent double replacements!
      if (content.includes('dark:text-[#EAEAEA]')) return; 

      let newContent = content;
      replacements.forEach(rep => {
         // Some replacements might overlap, so we keep it simple
         // Do not run on globals.css since we just manually updated it
         if(file.includes('globals.css')) return;
         newContent = newContent.replace(rep.p, rep.r);
      });
      if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        console.log('Fixed Light Mode in: ' + file);
      }
    }
  });
});
