const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

content = content.replace(
  '        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-8">',
  '        <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-8">'
);

// We need to fix the closing tags. Let's just do a clean replace using regex.
// Wait, I can just restore it and do it properly with edit_file.
