import type { ComponentType } from "react";
import { Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { A } from "../lib/assets";
import { body } from "../lib/fonts";
import { RESEARCH_AREAS } from "../lib/research";

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
  { label: "AI Assistant", href: "/ai" },
  { label: "Publications", href: "/publications" },
  { label: "Field Notes", href: "/field-notes" },
  { label: "Gallery", href: "/gallery" },
  { label: "Exhibition", href: "/exhibition" },
  { label: "About Us", href: "/about-us" },
  { label: "Contact", href: "/contact-us" },
];

type Social = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  // mailto opens in place; external links open in a new tab.
  external: boolean;
};

const socials: Social[] = [
  {
    label: "Instagram",
    icon: Instagram,
    href: "https://www.instagram.com/smartagri.ugm/",
    external: true,
  },
  {
    label: "LinkedIn",
    icon: Linkedin,
    href: "https://www.linkedin.com/company/sarc-ugm",
    external: true,
  },
  {
    label: "Email",
    icon: Mail,
    href: "mailto:hello@smart-agri.id",
    external: false,
  },
  {
    label: "WhatsApp",
    icon: WhatsAppIcon,
    href: "https://wa.me/6285111220365",
    external: true,
  },
];

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
                <a
                  key={social.label}
                  href={social.href}
                  target={social.external ? "_blank" : undefined}
                  rel={social.external ? "noreferrer" : undefined}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <social.icon className="w-[18px] h-[18px] text-white/80" />
                </a>
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
