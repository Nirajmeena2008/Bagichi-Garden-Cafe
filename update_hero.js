const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

// Add motion import
content = content.replace(
  'import { Utensils, Calendar, MapPin, MessageSquare, ClipboardCheck, Sparkles } from "lucide-react";',
  'import { Utensils, Calendar, MapPin, MessageSquare, ClipboardCheck, Sparkles } from "lucide-react";\nimport { motion } from "motion/react";'
);

// Add variants
const variantsCode = `
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };
`;

content = content.replace(
  'const [ready, setReady] = useState(false);',
  'const [ready, setReady] = useState(false);\n' + variantsCode
);

// Replace hero__body with motion.div
content = content.replace(
  '<div className="hero__body shell text-center flex flex-col items-center">',
  '<motion.div variants={container} initial="hidden" animate="show" className="hero__body shell text-center flex flex-col items-center">'
);
content = content.replace(
  '      <div className="rating shell mt-8">',
  '      </motion.div>\n      <div className="rating shell mt-8">' // But wait, maybe the closing div is before the rating shell.
);
// Actually it's better to just regex the wrappers.
