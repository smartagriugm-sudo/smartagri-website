import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy | smartagri" },
      {
        name: "description",
        content:
          "How the Smart Agriculture Research Center, UGM collects, uses, and protects information submitted through this website.",
      },
    ],
  }),
});

const LAST_UPDATED = "24 July 2026";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xl md:text-2xl font-semibold tracking-[-0.02em] text-neutral-900 mt-10 mb-3"
      style={display}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[15px] md:text-base leading-relaxed text-neutral-600 mb-4"
      style={body}
    >
      {children}
    </p>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 mb-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#45DFB1] mt-2.5 shrink-0" />
          <span
            className="text-[15px] md:text-base leading-relaxed text-neutral-600"
            style={body}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PrivacyPolicyPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-white">
        <div className="max-w-[820px] mx-auto px-6 md:px-8 pt-14 md:pt-20 pb-16 md:pb-24">
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.1] text-neutral-900"
            style={display}
          >
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-neutral-400" style={body}>
            Last updated: {LAST_UPDATED}
          </p>

          <div className="mt-8">
            <P>
              This Privacy Policy explains how the Smart Agriculture Research
              Center (smartagri), Department of Agricultural and Biosystems
              Engineering, Universitas Gadjah Mada, handles information you
              provide through this website (smart-agri.id). We collect only what
              we need to respond to you and to run our programs, and we do not
              sell your personal data.
            </P>

            <H2>Information we collect</H2>
            <P>We collect information only when you choose to give it to us:</P>
            <List
              items={[
                "Inquiry form: when you use the contact form, we receive the name, email, organization, research area, and message you submit so we can reply.",
                "Guest book: at our exhibitions and booth, you may leave your name, institution, role, email, and WhatsApp number.",
                "Research assistant sign-in: team members who use the internal AI assistant have an account (email and password) managed by our authentication provider.",
                "Usage data: for our link-in-bio page we record anonymous, aggregate counts of page views and button clicks. These contain no personal identifiers.",
                "Technical logs: our hosting provider automatically records standard request logs (such as IP address and browser type) to keep the site secure and reliable.",
              ]}
            />

            <H2>How we use information</H2>
            <List
              items={[
                "To respond to your questions and follow up on collaborations.",
                "To keep in touch with visitors we meet at events.",
                "To operate and secure the website and its internal tools.",
                "To understand, in aggregate, how our pages are used so we can improve them.",
              ]}
            />

            <H2>Service providers</H2>
            <P>
              We use a small number of trusted third-party services to run this
              website. They process data on our behalf and only for the purposes
              above:
            </P>
            <List
              items={[
                "Google (Google Sheets and Apps Script) stores contact-form submissions and sends us email notifications.",
                "Supabase hosts the database for the guest book, usage counts, and internal sign-in.",
                "Vercel hosts and serves the website.",
              ]}
            />

            <H2>Cookies</H2>
            <P>
              Public pages of this website do not use advertising or tracking
              cookies. A session cookie is used only for team members who sign in
              to the internal research assistant, to keep them logged in.
            </P>

            <H2>Data retention</H2>
            <P>
              We keep the information you submit only as long as needed for the
              purpose it was given, or as required by our institution, and then
              delete or anonymize it. Aggregate usage counts contain no personal
              data and may be kept indefinitely.
            </P>

            <H2>Your choices</H2>
            <P>
              You may ask us to access, correct, or delete the personal
              information you have given us. Email us at{" "}
              <a
                href="mailto:hello@smart-agri.id"
                className="text-[#0B6477] hover:underline"
              >
                hello@smart-agri.id
              </a>{" "}
              and we will respond within a reasonable time.
            </P>

            <H2>Children</H2>
            <P>
              This website is intended for researchers, partners, and the general
              public, and is not directed at children under 13. We do not
              knowingly collect information from children.
            </P>

            <H2>Changes to this policy</H2>
            <P>
              We may update this policy from time to time. When we do, we will
              revise the date at the top of this page.
            </P>

            <H2>Contact</H2>
            <P>
              Smart Agriculture Research Center, Department of Agricultural and
              Biosystems Engineering, Faculty of Agricultural Technology,
              Universitas Gadjah Mada. Jl. Flora Bulaksumur No.1, Kocoran,
              Caturtunggal, Kec. Depok, Kabupaten Sleman, Daerah Istimewa
              Yogyakarta 55281. Email:{" "}
              <a
                href="mailto:hello@smart-agri.id"
                className="text-[#0B6477] hover:underline"
              >
                hello@smart-agri.id
              </a>
              .
            </P>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
