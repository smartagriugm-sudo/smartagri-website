import type { ComponentType } from "react";
import { motion, type Variants } from "framer-motion";
import { Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { A } from "../lib/assets";
import { body } from "../lib/fonts";
import { RESEARCH_AREAS } from "../lib/research";
import { EXHIBITION_LIVE } from "../lib/exhibition";
import { AI_ASSISTANT_ENABLED } from "../lib/features";

// lucide has no WhatsApp glyph; this is the standard mark, colored via currentColor.
function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.15-.174.199-.298.298-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const researchLinks = RESEARCH_AREAS.map((area) => ({
  label: area.label,
  href: `/research/${area.slug}`,
}));

const centerLinks = [
  { label: "Research", href: "/research" },
  { label: "Technology", href: "/technology" },
  ...(AI_ASSISTANT_ENABLED ? [{ label: "AI Assistant", href: "/ai" }] : []),
  { label: "Publications", href: "/publications" },
  { label: "Field Notes", href: "/field-notes" },
  { label: "Gallery", href: "/gallery" },
  ...(EXHIBITION_LIVE ? [{ label: "Exhibition", href: "/exhibition" }] : []),
  { label: "About Us", href: "/about-us" },
  { label: "Contact", href: "/contact-us" },
];

type Social = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  // mailto opens in place; external links open in a new tab.
  external: boolean;
  /** Shown above the button on hover: where the link goes */
  handle: string;
  /** Hover fill: the platform's own colour (ours for email) */
  fill: string;
  /** Icon colour once filled */
  ink: string;
  /** How the fill arrives */
  reveal: Variants;
  /** What the icon does */
  move: Variants;
  /** Ring pulsing out while hovered (WhatsApp: an incoming call) */
  ring?: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

const socials: Social[] = [
  {
    label: "Instagram",
    icon: Instagram,
    href: "https://www.instagram.com/smartagri.ugm/",
    external: true,
    handle: "@smartagri.ugm",
    fill: "radial-gradient(circle at 25% 110%, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 72%, #4F5BD5 100%)",
    ink: "#FFFFFF",
    // Gradient blooms in from the bottom-left corner, like the app icon.
    reveal: {
      rest: { scale: 0, opacity: 0 },
      hover: { scale: 1, opacity: 1, transition: { duration: 0.45, ease: EASE } },
    },
    // Camera tilts as if taking a shot.
    move: {
      rest: { rotate: 0, scale: 1 },
      hover: {
        rotate: [0, -14, 8, 0],
        scale: [1, 1.15, 1.08],
        transition: { duration: 0.6, ease: EASE },
      },
    },
  },
  {
    label: "LinkedIn",
    icon: Linkedin,
    href: "https://www.linkedin.com/company/sarc-ugm",
    external: true,
    handle: "SARC UGM",
    fill: "#0A66C2",
    ink: "#FFFFFF",
    // Blue rises from the bottom.
    reveal: {
      rest: { clipPath: "inset(100% 0% 0% 0%)", opacity: 1 },
      hover: {
        clipPath: "inset(0% 0% 0% 0%)",
        opacity: 1,
        transition: { duration: 0.4, ease: EASE },
      },
    },
    // A small professional hop.
    move: {
      rest: { y: 0 },
      hover: { y: [0, -5, 0, -2, 0], transition: { duration: 0.6, ease: "easeOut" } },
    },
  },
  {
    label: "Email",
    icon: Mail,
    href: "mailto:hello@smart-agri.id",
    external: false,
    handle: "hello@smart-agri.id",
    fill: "#45DFB1",
    ink: "#0B2A22",
    // Mint sweeps in from the left.
    reveal: {
      rest: { clipPath: "inset(0% 100% 0% 0%)", opacity: 1 },
      hover: {
        clipPath: "inset(0% 0% 0% 0%)",
        opacity: 1,
        transition: { duration: 0.4, ease: EASE },
      },
    },
    // The envelope flies off to the top right and comes back in: sent.
    move: {
      rest: { x: 0, y: 0, opacity: 1 },
      hover: {
        x: [0, 16, -16, 0],
        y: [0, -16, 16, 0],
        opacity: [1, 0, 0, 1],
        transition: { duration: 0.7, times: [0, 0.4, 0.41, 1], ease: "easeInOut" },
      },
    },
  },
  {
    label: "WhatsApp",
    icon: WhatsAppIcon,
    href: "https://wa.me/6285111220365",
    external: true,
    handle: "+62 851-1122-0365",
    fill: "#25D366",
    ink: "#FFFFFF",
    // Green opens out from the centre.
    reveal: {
      rest: { scale: 0, opacity: 0 },
      hover: { scale: 1, opacity: 1, transition: { duration: 0.4, ease: EASE } },
    },
    // Rings like an incoming call.
    move: {
      rest: { rotate: 0 },
      hover: {
        rotate: [0, -16, 16, -12, 12, -6, 0],
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
    ring: "#25D366",
  },
];

// Round social button: on hover (or keyboard focus) the platform colour fills
// it in its own way, the icon makes a platform-specific move, and where the
// link goes floats up above it.
function SocialButton({ social }: { social: Social }) {
  return (
    <motion.a
      href={social.href}
      target={social.external ? "_blank" : undefined}
      rel={social.external ? "noreferrer" : undefined}
      aria-label={`${social.label}: ${social.handle}`}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileFocus="hover"
      whileTap={{ scale: 0.92 }}
      className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 outline-none focus-visible:ring-2 focus-visible:ring-[#45DFB1]/70"
    >
      {/* Platform-colour fill, clipped to the circle. */}
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <motion.span
          variants={social.reveal}
          className="absolute inset-0"
          style={{ background: social.fill, originX: 0.2, originY: 1 }}
        />
      </span>
      {social.ring && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: social.ring }}
          variants={{
            rest: { scale: 1, opacity: 0 },
            hover: {
              scale: [1, 1.6],
              opacity: [0.7, 0],
              transition: { duration: 1, repeat: Infinity, ease: "easeOut" },
            },
          }}
        />
      )}
      <motion.span
        className="relative grid place-items-center"
        variants={{
          rest: { color: "rgba(255,255,255,0.8)" },
          hover: { color: social.ink, transition: { duration: 0.2 } },
        }}
      >
        <motion.span variants={social.move} className="grid place-items-center">
          <social.icon className="h-[18px] w-[18px]" />
        </motion.span>
      </motion.span>
      {/* Destination label. */}
      <motion.span
        aria-hidden="true"
        variants={{
          rest: { opacity: 0, y: 6, scale: 0.95 },
          hover: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: EASE } },
        }}
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2.5 py-1 text-[12px] font-medium text-[#0B2A22] shadow-lg"
        style={body}
      >
        {social.handle}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-white" />
      </motion.span>
    </motion.a>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#08313A] text-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.4fr_1.3fr] gap-10 lg:gap-8">
          <div>
            <img src={A.logoWhite} alt="smartagri" className="h-8 w-auto" />
            <p
              className="text-white/60 text-sm font-normal leading-relaxed max-w-[300px] mt-4"
              style={body}
            >
              Smart Agriculture Research Center UGM. We unite AI, IoT sensing,
              and agronomy to help farmers grow more sustainably.
            </p>
            <div className="flex gap-3 mt-6">
              {socials.map((social) => (
                <SocialButton key={social.label} social={social} />
              ))}
            </div>
          </div>

          <div>
            <div
              className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50 mb-4"
              style={body}
            >
              Research
            </div>
            <div className="flex flex-col gap-2.5">
              {researchLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[15px] font-normal text-white/75 hover:text-white transition-colors"
                  style={body}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div
              className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50 mb-4"
              style={body}
            >
              Center
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {centerLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[15px] font-normal text-white/75 hover:text-white transition-colors"
                  style={body}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div
              className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50 mb-4"
              style={body}
            >
              Contact
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#45DFB1] mt-1 shrink-0" />
                <span
                  className="text-[15px] font-normal text-white/75"
                  style={body}
                >
                  Jl. Flora Bulaksumur No.1, Kocoran, Caturtunggal, Kec. Depok,
                  Kabupaten Sleman, Daerah Istimewa Yogyakarta 55281
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#45DFB1] mt-1 shrink-0" />
                <a
                  href="mailto:hello@smart-agri.id"
                  className="text-[15px] font-normal text-white/75 hover:text-white transition-colors"
                  style={body}
                >
                  hello@smart-agri.id
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#45DFB1] mt-1 shrink-0" />
                <a
                  href="https://wa.me/6285111220365"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[15px] font-normal text-white/75 hover:text-white transition-colors"
                  style={body}
                >
                  +62 85111220365
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3">
          <span className="text-sm font-normal text-white/45" style={body}>
            © 2026 Smart Agriculture Research Center, Faculty of Agricultural
            Technology, Universitas Gadjah Mada. All rights reserved.
          </span>
          <div className="flex gap-6">
            <a
              href="/privacy-policy"
              className="text-sm font-normal text-white/45 hover:text-white/80 transition-colors"
              style={body}
            >
              Privacy Policy
            </a>
            <a
              href="/terms-of-use"
              className="text-sm font-normal text-white/45 hover:text-white/80 transition-colors"
              style={body}
            >
              Terms of Use
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
