import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/terms-of-use")({
  component: TermsOfUsePage,
  head: () => ({
    meta: [
      { title: "Terms of Use | smartagri" },
      {
        name: "description",
        content:
          "The terms that govern your use of the Smart Agriculture Research Center (smartagri) website.",
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

function TermsOfUsePage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-white">
        <div className="max-w-[820px] mx-auto px-6 md:px-8 pt-14 md:pt-20 pb-16 md:pb-24">
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.1] text-neutral-900"
            style={display}
          >
            Terms of Use
          </h1>
          <p className="mt-3 text-sm text-neutral-400" style={body}>
            Last updated: {LAST_UPDATED}
          </p>

          <div className="mt-8">
            <P>
              These Terms of Use govern your access to and use of the website of
              the Smart Agriculture Research Center (smartagri), Department of
              Agricultural and Biosystems Engineering, Universitas Gadjah Mada,
              at smart-agri.id. By using this website, you agree to these terms.
              If you do not agree, please do not use the site.
            </P>

            <H2>Use of the website</H2>
            <P>
              You may browse this website and use its features for lawful,
              informational, academic, and collaboration purposes. You agree not
              to:
            </P>
            <List
              items={[
                "Use the site in any way that breaks the law or infringes the rights of others.",
                "Attempt to disrupt, damage, or gain unauthorized access to the site, its data, or its underlying systems.",
                "Submit false, misleading, or harmful information through our forms or guest book.",
                "Copy, scrape, or reuse content at scale without our permission.",
              ]}
            />

            <H2>Intellectual property</H2>
            <P>
              The content on this website, including text, graphics, the smartagri
              name and logo, research summaries, and publications, is owned by the
              Smart Agriculture Research Center and Universitas Gadjah Mada, or
              used with permission, and is protected by applicable intellectual
              property laws. Academic publications remain subject to the rights of
              their respective publishers and authors. You may share links and
              quote brief excerpts with attribution, but you may not reproduce
              substantial portions without permission.
            </P>

            <H2>Information is provided as is</H2>
            <P>
              The research summaries, guides, and other information on this site
              are provided for general and educational purposes. While we work to
              keep them accurate and current, we make no warranties about their
              completeness or fitness for a particular purpose. Nothing here is a
              substitute for professional agronomic, engineering, or financial
              advice for your specific situation.
            </P>

            <H2>Submissions</H2>
            <P>
              When you send us a message, sign our guest book, or otherwise submit
              information, you confirm that it is accurate and that you have the
              right to share it. Handling of the information you submit is
              described in our{" "}
              <a
                href="/privacy-policy"
                className="text-[#0B6477] hover:underline"
              >
                Privacy Policy
              </a>
              .
            </P>

            <H2>Third-party links and services</H2>
            <P>
              This website may link to external sites (for example, partner and
              publisher pages) and uses third-party services to run features such
              as forms and the guest book. We are not responsible for the content
              or practices of external sites. Your use of those services may be
              subject to their own terms.
            </P>

            <H2>Limitation of liability</H2>
            <P>
              To the extent permitted by law, the Smart Agriculture Research
              Center and Universitas Gadjah Mada are not liable for any loss or
              damage arising from your use of, or inability to use, this website
              or its content.
            </P>

            <H2>Changes to these terms</H2>
            <P>
              We may update these terms from time to time. Continued use of the
              website after changes take effect means you accept the updated
              terms. The date at the top of this page shows when they were last
              revised.
            </P>

            <H2>Governing law</H2>
            <P>
              These terms are governed by the laws of the Republic of Indonesia.
            </P>

            <H2>Contact</H2>
            <P>
              Questions about these terms can be sent to{" "}
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
