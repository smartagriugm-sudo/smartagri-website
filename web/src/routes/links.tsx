import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Globe, Instagram, Linkedin, Mail, MessageSquare } from "lucide-react";
import { A } from "../lib/assets";
import { body, display } from "../lib/fonts";
import { trackClick, trackView } from "../lib/links-analytics";

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
  // mailto and same-site links open in place; social/external open in a new tab.
  newTab?: boolean;
};

const LINKS: LinkItem[] = [
  {
    label: "Website",
    href: "https://www.smart-agri.id",
    icon: <Globe size={20} strokeWidth={1.75} />,
    newTab: true,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/smartagri.ugm",
    icon: <Instagram size={20} strokeWidth={1.75} />,
    newTab: true,
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/6285111220365",
    icon: <WhatsAppIcon />,
    newTab: true,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/sarc-ugm",
    icon: <Linkedin size={20} strokeWidth={1.75} />,
    newTab: true,
  },
  {
    label: "Email",
    href: "mailto:hello@smart-agri.id",
    icon: <Mail size={20} strokeWidth={1.75} />,
  },
  {
    label: "Question Form",
    href: "https://www.smart-agri.id/contact-us",
    icon: <MessageSquare size={20} strokeWidth={1.75} />,
    newTab: true,
  },
];

function LinksPage() {
  // Record one page view per mount (the ref guards against React's double-
  // invoke of effects in development StrictMode).
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackView();
  }, []);

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
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] sm:h-24 sm:w-24">
            <img
              src={A.iconColor}
              alt="smartagri"
              className="h-[68%] w-[68%] object-contain"
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
              target={item.newTab ? "_blank" : undefined}
              rel={item.newTab ? "noopener noreferrer" : undefined}
              onClick={() => trackClick(item.label)}
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
          Smart Agriculture Research Center UGM
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
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.15-.174.199-.298.298-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
