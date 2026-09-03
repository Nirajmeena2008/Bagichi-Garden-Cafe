const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

content = content.replace(
  'import { Utensils, Calendar, MapPin, MessageSquare, ClipboardCheck, Sparkles } from "lucide-react";',
  'import { Utensils, Calendar, MapPin, MessageSquare, ClipboardCheck, Sparkles } from "lucide-react";\nimport { motion } from "motion/react";'
);

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

content = content.replace(
  '<div className="hero__body shell text-center flex flex-col items-center">',
  '<motion.div variants={container} initial="hidden" animate="show" className="hero__body shell text-center flex flex-col items-center">'
);

content = content.replace(
  '        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-8">',
  '        <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-8">'
);
content = content.replace(
  '        <h1 className="hero__title text-center mx-auto">',
  '        <motion.h1 variants={item} className="hero__title text-center mx-auto">'
);
content = content.replace(
  '        </h1>',
  '        </motion.h1>'
);
content = content.replace(
  '        <p className="hero__sub text-center mx-auto mt-6">',
  '        <motion.p variants={item} className="hero__sub text-center mx-auto mt-6">'
);
content = content.replace(
  '        </p>',
  '        </motion.p>'
);
content = content.replace(
  '        {/* Primary Action Buttons */}\n        <div className="flex flex-wrap items-center justify-center gap-6 mt-14">',
  '        {/* Primary Action Buttons */}\n        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-6 mt-14">'
);
content = content.replace(
  '        {/* Secondary Quick Jump Sections Bar */}\n        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 max-w-3xl w-full">',
  '        {/* Secondary Quick Jump Sections Bar */}\n        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 max-w-3xl w-full">'
);
content = content.replace(
  '        </div>\n      </div>\n      <div className="rating shell mt-8">',
  '        </motion.div>\n      </motion.div>\n      <div className="rating shell mt-8">' // we replaced two divs with motion.divs
);

fs.writeFileSync('src/components/Hero.tsx', content);
console.log("Hero updated");
