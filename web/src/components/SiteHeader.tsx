import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { A } from "../lib/assets";
import { body } from "../lib/fonts";

const navLinks = [
  { label: "Research", to: "/research" },
  { label: "Impact", to: "/impact" },
  { label: "Publications", to: "/publications" },
  { label: "Field Notes", to: "/field-notes" },
  { label: "About Us", to: "/about-us" },
];

// Sticky on every page. `overlay` (landing) starts transparent over the hero
// video and turns solid once the page is scrolled.
export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const shell = overlay
    ? scrolled
      ? "fixed top-0 inset-x-0 bg-[#08313A]/85 backdrop-blur-lg shadow-lg"
      : "fixed top-0 inset-x-0 bg-transparent"
    : "sticky top-0 bg-[#08313A] shadow-lg";

  return (
    <header className={`${shell} z-50 text-white transition-colors duration-300`}>
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 h-[76px] flex items-center justify-between relative">
        <Link to="/" aria-label="smartagri home">
          <img src={A.logoWhite} alt="smartagri" className="h-8 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-white text-base opacity-90 hover:opacity-100"
              style={body}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/contact-us"
            className="h-10 px-5 rounded-full bg-[#45DFB1] text-[#0B2A22] font-medium flex items-center hover:bg-[#80ED99] transition-colors"
            style={body}
          >
            Contact us
          </Link>
        </nav>

        <div className="lg:hidden">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="w-11 h-11 rounded-full bg-[#08313A]/45 backdrop-blur-lg flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-6 mt-2 w-60 bg-[#08313A]/95 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-xl"
              >
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className="text-white text-base opacity-90 hover:opacity-100"
                    style={body}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/contact-us"
                  onClick={() => setMenuOpen(false)}
                  className="h-11 rounded-full bg-[#45DFB1] text-[#0B2A22] font-medium flex items-center justify-center"
                  style={body}
                >
                  Contact us
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
