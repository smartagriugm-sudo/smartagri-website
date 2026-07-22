import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Globe, Instagram } from "lucide-react";
import { A } from "../lib/assets";
import { body, display } from "../lib/fonts";

export const Route = createFileRoute("/links")({
  component: LinksPage,
  head: () => ({
    meta: [
      { title: "smartagri | Links" },
      {
        name: "description",
        content:
          "Connect with the Smart Agriculture Research Center, UGM: website, Instagram, and WhatsApp.",
      },
    ],
  }),
});

type LinkItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const LINKS: LinkItem[] = [
  {
    label: "Website",
    href: "https://www.smart-agri.id",
    icon: <Globe size={20} strokeWidth={1.75} />,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/smartagri.ugm",
    icon: <Instagram size={20} strokeWidth={1.75} />,
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/6285111220365",
    icon: <WhatsAppIcon />,
  },
];

function LinksPage() {
  return (
    <main
      className="relative min-h-dvh w-full overflow-hidden"
      style={{
        // Teal to mint wallpaper, glow anchored top-right like the profile art.
        backgroundColor: "#0B4A52",
        backgroundImage:
          "radial-gradient(120% 90% at 85% 0%, #80ED99 0%, #45DFB1 18%, #0AD1C8 38%, #14919B 58%, #0B6477 76%, #08313A 100%)",
      }}
    >
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center px-6 pb-10 pt-16 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] sm:h-32 sm:w-32">
            <img
              src={A.iconColor}
              alt="smartagri"
              className="h-[70%] w-[70%] object-contain"
            />
          </div>
          <h1
            style={display}
            className="mt-5 text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[28px]"
          >
            smartagri
          </h1>
        </motion.div>

        <nav className="mt-9 flex w-full flex-col gap-4 sm:mt-11">
          {LINKS.map((item, i) => (
            <motion.a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.15 + i * 0.08,
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              style={body}
              className="group relative flex w-full items-center justify-center rounded-2xl border border-white/15 bg-[#08313A]/45 px-5 py-4 text-[15px] font-medium text-white backdrop-blur-md transition-colors hover:border-white/30 hover:bg-[#08313A]/60"
            >
              <span className="absolute left-5 flex items-center text-white/85 transition-colors group-hover:text-[#80ED99]">
                {item.icon}
              </span>
              {item.label}
            </motion.a>
          ))}
        </nav>

        <div className="flex-1" />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={body}
          className="pt-10 text-center text-[13px] font-medium text-white/70"
        >
          Smart Agriculture Research Center, UGM
        </motion.p>
      </div>
    </main>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2Zm0 1.83c2.16 0 4.19.84 5.72 2.37a8.05 8.05 0 0 1 2.37 5.72c0 4.46-3.63 8.08-8.09 8.08a8.1 8.1 0 0 1-4.12-1.13l-.3-.18-3.12.82.83-3.04-.19-.31a8.05 8.05 0 0 1-1.24-4.32c0-4.46 3.63-8.08 8.09-8.08Zm-4.7 4.32c-.22 0-.58.08-.88.41-.3.33-1.15 1.12-1.15 2.73s1.18 3.17 1.34 3.39c.16.22 2.32 3.54 5.62 4.96.79.34 1.4.54 1.88.69.79.25 1.51.21 2.08.13.63-.09 1.95-.8 2.23-1.57.28-.77.28-1.43.19-1.57-.08-.13-.3-.21-.63-.38-.33-.16-1.95-.96-2.25-1.07-.3-.11-.52-.16-.74.17-.22.33-.85 1.07-1.04 1.29-.19.22-.38.25-.71.08-.33-.16-1.39-.51-2.65-1.63-.98-.87-1.64-1.95-1.83-2.28-.19-.33-.02-.51.14-.67.15-.15.33-.38.49-.58.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.58-.08-.16-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56l-.63-.01Z" />
    </svg>
  );
}
