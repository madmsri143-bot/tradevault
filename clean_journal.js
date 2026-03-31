const fs = require('fs');

let content = fs.readFileSync('./app/journal/page.tsx', 'utf8');

// 1. Remove Constants (DEFAULT_PROMPT to QUALITY_SCORES)
content = content.replace(/const DEFAULT_PROMPT = [\s\S]*?const QUALITY_SCORES = \["A", "B", "C", "D"\];\n/m, '');

// 2. Add Imports
content = content.replace(
  /import WeeklyReportWidget from "@\/components\/journal\/WeeklyReportWidget";\nimport { compressImage, uploadToCloudinary } from "@\/lib\/imageUtils";\n/m,
  `import WeeklyReportWidget from "@/components/journal/WeeklyReportWidget";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import NewReflectionModal from "@/components/journal/NewReflectionModal";\n`
);

// 3. Remove Form States
content = content.replace(/  \/\/ Form State[\s\S]*?const \[slFollowed, setSlFollowed\] = useState\(false\);\n/m, 
`  // Modal State
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);\n`);

// 4. Remove Handlers
content = content.replace(/  const handleImageChange = \([\s\S]*?setSubmitting\(false\);\n    }\n  };\n/m, '');

// 5. Remove Left Panel and fix grid
content = content.replace(/      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">\n        \n        {\/\* LEFT PANEL: Elite Form \*\/}[\s\S]*?{\/\* RIGHT PANEL: Display & Summary \*\/}\n        <div className="xl:col-span-2 space-y-6">/m,
`      {/* Add Reflection Button Line */}
      <div className="mb-6 w-full flex justify-start">
        {!isReflectionModalOpen && (
          <FloatingActionButton 
            onClick={() => setIsReflectionModalOpen(true)} 
            tooltip="New Reflection" 
          />
        )}
      </div>

      <div className="space-y-6">`);

// 6. Fix closing tags from the removed grid
content = content.replace(/          <\/div>\n        <\/div>\n      <\/div>\n\n      {\/\* Selected/m,
`          </div>\n      </div>\n\n      {/* Selected`);

// 7. Inject Modal at bottom
content = content.replace(/    <\/div>\n  \);\n}/m,
`      <NewReflectionModal 
        isOpen={isReflectionModalOpen} 
        onClose={() => setIsReflectionModalOpen(false)} 
        dailyJournalLimitReached={dailyJournalLimitReached}
      />
    </div>
  );
}`);

fs.writeFileSync('./app/journal/page.tsx', content);
console.log('Cleaned page.tsx');
