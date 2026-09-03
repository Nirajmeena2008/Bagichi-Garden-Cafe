import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Chevron, MenuIcon, SearchIcon } from "./icons";
import "../styles/Navbar.css";

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);


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
        type: "spring" as any,
        stiffness: 400,
        damping: 30,
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    closed: { opacity: 0, y: 10, scale: 0.9 },
    open: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as any, stiffness: 400, damping: 25 } }
  };

  const links = [
    { label: "Home", href: "/" },
    { label: "Order Online", href: "/order" },
    { label: "Track Order", href: "/track" },
    { label: "Menu", href: "/menu" },
    { label: "Book Table", href: "/booking" },
    { label: "Reviews", href: "/reviews" },
    { label: "Location & Hours", href: "/contact" },
    { label: "Manage Booking", href: "/manage" },
  ];

  return (
    <header className="nav">
      <div className="nav__inner shell">
        <Link to="/" className="nav__brand flex items-center gap-2">
          <img 
            src="/instagram-logo.png" 
            alt="The Bagichi Logo" 
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
            }}
          />
          The Bagichi
        </Link>

        <nav className="nav__rail" aria-label="Primary">
          {links.map((link, i) => {
            const isActive = location.pathname === link.href;
            return (
              <span className="nav__slot" key={link.label}>
                {i > 0 && <span className="nav__dot" aria-hidden="true" />}
                <Link
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? "text-[#e8a33d] font-semibold"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              </span>
            );
          })}
        </nav>

        <div className="nav__actions">
          <Link
            to="/booking"
            className="hidden lg:inline-flex items-center px-4 py-2 rounded-full bg-[#e8a33d] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#f3b55c] transition-all"
          >
            Reserve Table
          </Link>
        </div>

        <button 
          className="nav__toggle text-white p-2" 
          aria-expanded={open} 
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          <MenuIcon open={open} />
        </button>
      </div>

      <AnimatePresence>
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
                    className={`block py-3 px-2 border-b border-white/10 last:border-0 text-sm tracking-wide ${
                      isActive ? "text-[#e8a33d] font-bold" : "text-white/80"
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
