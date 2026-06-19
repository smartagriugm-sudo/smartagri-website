import { Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { A } from "../lib/assets";
import { body } from "../lib/fonts";
import { RESEARCH_AREAS } from "../lib/research";

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

const socials = [
  {
    label: "Instagram",
    icon: Instagram,
    href: "https://www.instagram.com/smartagri.ugm/",
  },
  {
    label: "LinkedIn",
    icon: Linkedin,
    href: "https://www.linkedin.com/company/sarc-ugm",
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
                  target="_blank"
                  rel="noreferrer"
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
                  href="mailto:hello@smartagri.id"
                  className="text-[15px] font-normal text-white/75 hover:text-white transition-colors"
                  style={body}
                >
                  hello@smartagri.id
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#45DFB1] mt-1 shrink-0" />
                <span
                  className="text-[15px] font-normal text-white/75"
                  style={body}
                >
                  +62 274 000 0000
                </span>
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
              href="#"
              className="text-sm font-normal text-white/45 hover:text-white/80 transition-colors"
              style={body}
            >
              Privacy Policy
            </a>
            <a
              href="#"
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
