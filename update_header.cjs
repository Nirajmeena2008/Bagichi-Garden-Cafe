const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Add motion import
content = content.replace(
  'import { Link, useLocation } from "react-router-dom";',
  'import { Link, useLocation } from "react-router-dom";\nimport { motion, AnimatePresence } from "motion/react";'
);

const fabVariants = `
  const menuVariants = {
    closed: {
      opacity: 0,
      scale: 0.95,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    },
    open: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    closed: { opacity: 0, y: 10, scale: 0.9 },
    open: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }
  };
`;

content = content.replace(
  '  const links = [',
  fabVariants + '\n  const links = ['
);

const originalMenu = `{open && (
        <div className="nav__sheet">
          {links.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setOpen(false)}
                className={\`py-3 px-2 border-b border-white/10 last:border-0 text-sm tracking-wide \${
                  isActive ? "text-[#e8a33d] font-bold" : "text-white/80"
                }\`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}`;

const newMenu = `<AnimatePresence>
        {open && (
          <motion.div 
            className="nav__sheet"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            style={{ transformOrigin: 'top right' }}
          >
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <motion.div key={link.label} variants={itemVariants}>
                  <Link
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className={\`block py-3 px-2 border-b border-white/10 last:border-0 text-sm tracking-wide \${
                      isActive ? "text-[#e8a33d] font-bold" : "text-white/80"
                    }\`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>`;

content = content.replace(originalMenu, newMenu);

fs.writeFileSync('src/components/Header.tsx', content);
console.log("Header updated");
