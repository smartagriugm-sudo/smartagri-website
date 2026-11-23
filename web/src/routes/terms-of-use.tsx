import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { headLang, useLang, useT } from "../lib/i18n";

export const Route = createFileRoute("/terms-of-use")({
  component: TermsOfUsePage,
  head: ({ matches }) => {
    const l = headLang(matches);
    return {
      meta: [
        { title: l === "id" ? "Ketentuan Penggunaan | smartagri" : "Terms of Use | smartagri" },
        {
          name: "description",
          content:
            l === "id"
              ? "Ketentuan yang mengatur penggunaan Anda atas situs web Smart Agriculture Research Center (smartagri)."
              : "The terms that govern your use of the Smart Agriculture Research Center (smartagri) website.",
        },
      ],
    };
  },
});

const LAST_UPDATED = { en: "24 July 2026", id: "24 Juli 2026" };

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
  const t = useT();
  const lang = useLang();
  return (
    <main>
      <SiteHeader />
      <section className="bg-white">
        <div className="max-w-[820px] mx-auto px-6 md:px-8 pt-14 md:pt-20 pb-16 md:pb-24">
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.1] text-neutral-900"
            style={display}
          >
            {t({ en: "Terms of Use", id: "Ketentuan Penggunaan" })}
          </h1>
          <p className="mt-3 text-sm text-neutral-400" style={body}>
            {t({ en: "Last updated", id: "Terakhir diperbarui" })}: {t(LAST_UPDATED)}
          </p>

          {lang === "id" ? (
            <ContentId />
          ) : (
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
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

// Bahasa Indonesia version of the terms, kept section for section parallel
// to the English text above.
function ContentId() {
  return (
    <div className="mt-8">
      <P>
        Ketentuan Penggunaan ini mengatur akses dan penggunaan Anda atas situs web
        Smart Agriculture Research Center (smartagri), Departemen Teknik Pertanian
        dan Biosistem, Universitas Gadjah Mada, di smart-agri.id. Dengan menggunakan
        situs web ini, Anda menyetujui ketentuan ini. Jika Anda tidak setuju, mohon
        untuk tidak menggunakan situs ini.
      </P>

      <H2>Penggunaan situs web</H2>
      <P>
        Anda dapat menjelajahi situs web ini dan menggunakan fiturnya untuk tujuan
        yang sah, informasional, akademik, dan kolaborasi. Anda setuju untuk tidak:
      </P>
      <List
        items={[
          "Menggunakan situs dengan cara apa pun yang melanggar hukum atau hak pihak lain.",
          "Berupaya mengganggu, merusak, atau memperoleh akses tanpa izin ke situs, datanya, maupun sistem yang mendasarinya.",
          "Mengirimkan informasi yang palsu, menyesatkan, atau merugikan melalui formulir atau buku tamu kami.",
          "Menyalin, melakukan scraping, atau menggunakan ulang konten dalam skala besar tanpa izin kami.",
        ]}
      />

      <H2>Kekayaan intelektual</H2>
      <P>
        Konten di situs web ini, termasuk teks, grafis, nama dan logo smartagri,
        ringkasan riset, dan publikasi, dimiliki oleh Smart Agriculture Research
        Center dan Universitas Gadjah Mada, atau digunakan dengan izin, serta
        dilindungi oleh peraturan perundang-undangan kekayaan intelektual yang
        berlaku. Publikasi akademik tetap tunduk pada hak penerbit dan penulisnya
        masing-masing. Anda boleh membagikan tautan dan mengutip cuplikan singkat
        dengan mencantumkan sumbernya, tetapi tidak boleh memperbanyak bagian yang
        substansial tanpa izin.
      </P>

      <H2>Informasi disediakan apa adanya</H2>
      <P>
        Ringkasan riset, panduan, dan informasi lain di situs ini disediakan untuk
        tujuan umum dan edukasi. Meskipun kami berupaya menjaganya tetap akurat dan
        mutakhir, kami tidak memberikan jaminan apa pun atas kelengkapannya atau
        kesesuaiannya untuk tujuan tertentu. Tidak ada isi situs ini yang dapat
        menggantikan nasihat profesional di bidang agronomi, teknik, atau keuangan
        untuk kondisi spesifik Anda.
      </P>

      <H2>Kiriman</H2>
      <P>
        Saat Anda mengirimkan pesan kepada kami, mengisi buku tamu, atau
        menyampaikan informasi dengan cara lain, Anda menyatakan bahwa informasi
        tersebut akurat dan bahwa Anda berhak membagikannya. Pengelolaan informasi
        yang Anda kirimkan dijelaskan dalam{" "}
        <a href="/privacy-policy" className="text-[#0B6477] hover:underline">
          Kebijakan Privasi
        </a>{" "}
        kami.
      </P>

      <H2>Tautan dan layanan pihak ketiga</H2>
      <P>
        Situs web ini dapat memuat tautan ke situs eksternal (misalnya halaman mitra
        dan penerbit) dan menggunakan layanan pihak ketiga untuk menjalankan fitur
        seperti formulir dan buku tamu. Kami tidak bertanggung jawab atas konten
        atau praktik situs eksternal. Penggunaan Anda atas layanan tersebut dapat
        tunduk pada ketentuan masing-masing layanan.
      </P>

      <H2>Batasan tanggung jawab</H2>
      <P>
        Sejauh diizinkan oleh hukum, Smart Agriculture Research Center dan
        Universitas Gadjah Mada tidak bertanggung jawab atas kerugian atau kerusakan
        apa pun yang timbul dari penggunaan Anda, atau ketidakmampuan Anda untuk
        menggunakan, situs web ini maupun kontennya.
      </P>

      <H2>Perubahan ketentuan ini</H2>
      <P>
        Kami dapat memperbarui ketentuan ini dari waktu ke waktu. Dengan tetap
        menggunakan situs web setelah perubahan berlaku, Anda dianggap menerima
        ketentuan yang telah diperbarui. Tanggal di bagian atas halaman ini
        menunjukkan kapan ketentuan ini terakhir direvisi.
      </P>

      <H2>Hukum yang berlaku</H2>
      <P>Ketentuan ini diatur oleh hukum Negara Republik Indonesia.</P>

      <H2>Kontak</H2>
      <P>
        Pertanyaan mengenai ketentuan ini dapat dikirimkan ke{" "}
        <a href="mailto:hello@smart-agri.id" className="text-[#0B6477] hover:underline">
          hello@smart-agri.id
        </a>
        .
      </P>
    </div>
  );
}
