import { createFileRoute } from "@tanstack/react-router";
import { body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { headLang, useLang, useT } from "../lib/i18n";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
  head: ({ matches }) => {
    const l = headLang(matches);
    return {
      meta: [
        { title: l === "id" ? "Kebijakan Privasi | smartagri" : "Privacy Policy | smartagri" },
        {
          name: "description",
          content:
            l === "id"
              ? "Cara Smart Agriculture Research Center, UGM mengumpulkan, menggunakan, dan melindungi informasi yang dikirimkan melalui situs web ini."
              : "How the Smart Agriculture Research Center, UGM collects, uses, and protects information submitted through this website.",
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

function PrivacyPolicyPage() {
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
            {t({ en: "Privacy Policy", id: "Kebijakan Privasi" })}
          </h1>
          <p className="mt-3 text-sm text-neutral-400" style={body}>
            {t({ en: "Last updated", id: "Terakhir diperbarui" })}: {t(LAST_UPDATED)}
          </p>

          {lang === "id" ? (
            <ContentId />
          ) : (
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
              to the internal research assistant, to keep them logged in. A small
              language cookie remembers whether you chose English or Bahasa
              Indonesia; it holds no personal data.
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
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

// Bahasa Indonesia version of the policy, kept section for section parallel
// to the English text above.
function ContentId() {
  return (
    <div className="mt-8">
      <P>
        Kebijakan Privasi ini menjelaskan cara Smart Agriculture Research Center
        (smartagri), Departemen Teknik Pertanian dan Biosistem, Universitas Gadjah
        Mada, mengelola informasi yang Anda berikan melalui situs web ini
        (smart-agri.id). Kami hanya mengumpulkan informasi yang kami perlukan untuk
        menanggapi Anda dan menjalankan program kami, dan kami tidak menjual data
        pribadi Anda.
      </P>

      <H2>Informasi yang kami kumpulkan</H2>
      <P>Kami hanya mengumpulkan informasi yang Anda pilih untuk diberikan kepada kami:</P>
      <List
        items={[
          "Formulir pesan: saat Anda menggunakan formulir kontak, kami menerima nama, email, organisasi, bidang riset, dan pesan yang Anda kirimkan agar kami dapat membalasnya.",
          "Buku tamu: di pameran dan booth kami, Anda dapat meninggalkan nama, institusi, jabatan, email, dan nomor WhatsApp.",
          "Akun asisten riset: anggota tim yang menggunakan asisten AI internal memiliki akun (email dan kata sandi) yang dikelola oleh penyedia layanan autentikasi kami.",
          "Data penggunaan: untuk halaman link-in-bio, kami mencatat jumlah kunjungan halaman dan klik tombol secara anonim dan agregat. Data ini tidak memuat pengenal pribadi apa pun.",
          "Log teknis: penyedia hosting kami secara otomatis mencatat log permintaan standar (seperti alamat IP dan jenis peramban) untuk menjaga keamanan dan keandalan situs.",
        ]}
      />

      <H2>Cara kami menggunakan informasi</H2>
      <List
        items={[
          "Untuk menjawab pertanyaan Anda dan menindaklanjuti kolaborasi.",
          "Untuk tetap berhubungan dengan pengunjung yang kami temui di berbagai acara.",
          "Untuk mengoperasikan dan mengamankan situs web beserta perangkat internalnya.",
          "Untuk memahami, secara agregat, bagaimana halaman kami digunakan agar dapat kami tingkatkan.",
        ]}
      />

      <H2>Penyedia layanan</H2>
      <P>
        Kami menggunakan sejumlah kecil layanan pihak ketiga tepercaya untuk
        menjalankan situs web ini. Mereka memproses data atas nama kami dan hanya
        untuk tujuan di atas:
      </P>
      <List
        items={[
          "Google (Google Sheets dan Apps Script) menyimpan kiriman formulir kontak dan mengirimkan notifikasi email kepada kami.",
          "Supabase menyediakan basis data untuk buku tamu, jumlah penggunaan, dan akun internal.",
          "Vercel menjadi tempat hosting dan menyajikan situs web.",
        ]}
      />

      <H2>Cookie</H2>
      <P>
        Halaman publik situs web ini tidak menggunakan cookie iklan atau cookie
        pelacak. Cookie sesi hanya digunakan bagi anggota tim yang masuk ke asisten
        riset internal, agar mereka tetap dalam keadaan masuk. Sebuah cookie
        bahasa kecil menyimpan pilihan Anda antara bahasa Inggris dan Bahasa
        Indonesia; cookie ini tidak memuat data pribadi.
      </P>

      <H2>Penyimpanan data</H2>
      <P>
        Kami menyimpan informasi yang Anda kirimkan hanya selama diperlukan untuk
        tujuan pemberiannya, atau selama diwajibkan oleh institusi kami, lalu
        menghapus atau menganonimkannya. Jumlah penggunaan agregat tidak memuat data
        pribadi dan dapat disimpan tanpa batas waktu.
      </P>

      <H2>Pilihan Anda</H2>
      <P>
        Anda dapat meminta kami untuk memberikan akses, memperbaiki, atau menghapus
        informasi pribadi yang telah Anda berikan. Kirim email kepada kami di{" "}
        <a href="mailto:hello@smart-agri.id" className="text-[#0B6477] hover:underline">
          hello@smart-agri.id
        </a>{" "}
        dan kami akan menanggapinya dalam jangka waktu yang wajar.
      </P>

      <H2>Anak-anak</H2>
      <P>
        Situs web ini ditujukan bagi peneliti, mitra, dan masyarakat umum, dan tidak
        ditujukan bagi anak-anak di bawah usia 13 tahun. Kami tidak secara sengaja
        mengumpulkan informasi dari anak-anak.
      </P>

      <H2>Perubahan kebijakan ini</H2>
      <P>
        Kami dapat memperbarui kebijakan ini dari waktu ke waktu. Setiap kali kami
        melakukannya, kami akan memperbarui tanggal di bagian atas halaman ini.
      </P>

      <H2>Kontak</H2>
      <P>
        Smart Agriculture Research Center, Departemen Teknik Pertanian dan
        Biosistem, Fakultas Teknologi Pertanian, Universitas Gadjah Mada. Jl. Flora
        Bulaksumur No.1, Kocoran, Caturtunggal, Kec. Depok, Kabupaten Sleman, Daerah
        Istimewa Yogyakarta 55281. Email:{" "}
        <a href="mailto:hello@smart-agri.id" className="text-[#0B6477] hover:underline">
          hello@smart-agri.id
        </a>
        .
      </P>
    </div>
  );
}
