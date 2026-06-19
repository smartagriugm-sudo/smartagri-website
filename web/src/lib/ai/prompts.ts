import type { DocumentType, DocumentTypeConfig } from './types'

// ─── Chat System Prompt ────────────────────────────────────────────────────

export const CHAT_SYSTEM_PROMPT = `Kamu adalah AI Research Assistant SmartAgri — asisten riset cerdas milik Smart Agriculture Research Center (SARC), Departemen Teknik Pertanian dan Biosistem (DTPB), Fakultas Teknologi Pertanian, Universitas Gadjah Mada (UGM), Yogyakarta, Indonesia.

Spesialisasi kamu:
- Pertanian presisi dan smart farming (IoT, sensor, otomasi)
- Sistem irigasi tetes dan fertigasi otomatis
- Greenhouse cerdas dan plant factory (hidroponik, aeroponik, NFT)
- Hyperspectral imaging dan computer vision untuk pertanian
- UAV/drone multispektral untuk pemetaan lahan
- Penulisan akademik: jurnal ilmiah, proposal penelitian, laporan kegiatan
- Metodologi riset teknik pertanian dan biosistem

Cara kamu menjawab:
- Gunakan Bahasa Indonesia yang profesional namun mudah dipahami, kecuali user menulis dalam Bahasa Inggris
- Untuk pertanyaan teknis, sertakan referensi ilmiah atau standar yang relevan bila memungkinkan
- Strukturkan jawaban dengan jelas menggunakan heading, bullet, atau numbering bila sesuai
- Akui keterbatasan dengan jujur jika topik di luar spesialisasi
- Jangan membuat data atau referensi yang tidak kamu yakini kebenarannya`

// ─── Document Type Configs (untuk form fields) ────────────────────────────

export const DOCUMENT_TYPE_CONFIGS: Record<DocumentType, DocumentTypeConfig> = {
  activity_report: {
    label: 'Laporan Kegiatan',
    description: 'Laporan resmi kegiatan field visit, monitoring, atau deployment',
    fields: [
      { key: 'title', label: 'Judul Kegiatan', type: 'text', required: true, placeholder: 'cth: Monitoring Sistem Irigasi Tetes KWT Teratai Mekar' },
      { key: 'date', label: 'Tanggal & Lokasi', type: 'text', required: true, placeholder: 'cth: 15 Juni 2026, Condongcatur, Sleman' },
      { key: 'team', label: 'Tim / Peserta', type: 'text', required: false, placeholder: 'cth: Tim SARC UGM (3 orang)' },
      { key: 'description', label: 'Deskripsi Kegiatan', type: 'textarea', required: true, placeholder: 'Jelaskan apa yang dilakukan selama kegiatan...' },
      { key: 'findings', label: 'Hasil & Temuan Utama', type: 'textarea', required: true, placeholder: 'Apa yang ditemukan atau dicapai...' },
      { key: 'language', label: 'Bahasa Output', type: 'select', required: true,
        options: [{ value: 'id', label: 'Bahasa Indonesia' }, { value: 'en', label: 'English' }] },
    ],
  },
  news_article: {
    label: 'Berita / Artikel SmartAgri',
    description: 'Artikel jurnalistik ilmiah populer untuk website SARC',
    fields: [
      { key: 'title', label: 'Judul Artikel', type: 'text', required: true, placeholder: 'cth: SARC UGM Resmikan Sistem Fertigasi Otomatis di Sleman' },
      { key: 'event', label: 'Topik / Event yang Diliput', type: 'text', required: true, placeholder: 'cth: Peluncuran program RGBI 2026 di KWT Teratai Mekar' },
      { key: 'keyPoints', label: 'Poin-Poin Penting', type: 'textarea', required: true, placeholder: 'Tuliskan poin-poin utama yang ingin disampaikan...' },
      { key: 'tone', label: 'Tone Penulisan', type: 'select', required: true,
        options: [{ value: 'formal', label: 'Formal' }, { value: 'semiformal', label: 'Semi-formal' }] },
      { key: 'length', label: 'Panjang Artikel', type: 'select', required: true,
        options: [{ value: 'short', label: 'Singkat (~300 kata)' }, { value: 'medium', label: 'Standar (~600 kata)' }, { value: 'long', label: 'Panjang (~1000 kata)' }] },
      { key: 'language', label: 'Bahasa Output', type: 'select', required: true,
        options: [{ value: 'id', label: 'Bahasa Indonesia' }, { value: 'en', label: 'English' }, { value: 'both', label: 'Bilingual (keduanya)' }] },
    ],
  },
  research_proposal: {
    label: 'Draft Proposal Penelitian',
    description: 'Kerangka proposal riset akademik',
    fields: [
      { key: 'title', label: 'Judul Penelitian', type: 'text', required: true, placeholder: 'cth: Optimasi Fertigasi Berbasis IoT pada Tomat Greenhouse' },
      { key: 'field', label: 'Bidang / Topik', type: 'text', required: true, placeholder: 'cth: Teknik Irigasi, Smart Greenhouse, Hortikultura' },
      { key: 'background', label: 'Latar Belakang Singkat', type: 'textarea', required: true, placeholder: 'Apa masalah yang melatarbelakangi penelitian ini...' },
      { key: 'objectives', label: 'Tujuan Penelitian', type: 'textarea', required: true, placeholder: 'Apa yang ingin dicapai...' },
      { key: 'methods', label: 'Metode yang Direncanakan', type: 'textarea', required: false, placeholder: 'Pendekatan riset, alat, bahan, prosedur...' },
      { key: 'outputs', label: 'Target Luaran', type: 'text', required: false, placeholder: 'cth: Jurnal Scopus Q2, prototipe sistem, paten' },
    ],
  },
  journal_abstract: {
    label: 'Abstrak Jurnal Ilmiah',
    description: 'Draft abstrak 200-250 kata format IMRaD untuk paper ilmiah',
    fields: [
      { key: 'title', label: 'Judul Paper', type: 'text', required: true, placeholder: 'cth: Hyperspectral-Based Stomatal Conductance Estimation...' },
      { key: 'background', label: 'Latar Belakang / Masalah', type: 'textarea', required: true, placeholder: 'Apa gap penelitian yang diisi...' },
      { key: 'methods', label: 'Metode', type: 'textarea', required: true, placeholder: 'Pendekatan, dataset, algoritma, eksperimen...' },
      { key: 'results', label: 'Hasil Utama', type: 'textarea', required: true, placeholder: 'Temuan dan angka kunci...' },
      { key: 'conclusion', label: 'Kesimpulan & Implikasi', type: 'textarea', required: true, placeholder: 'Apa maknanya dan rekomendasi ke depan...' },
      { key: 'language', label: 'Bahasa Output', type: 'select', required: true,
        options: [{ value: 'en', label: 'English' }, { value: 'id', label: 'Bahasa Indonesia' }] },
    ],
  },
  data_summary: {
    label: 'Ringkasan Data & Analisis',
    description: 'Narasi interpretatif dari data sensor, eksperimen, atau survei',
    fields: [
      { key: 'dataContext', label: 'Konteks Data', type: 'text', required: true, placeholder: 'cth: Data sensor suhu & kelembaban greenhouse selama 7 hari' },
      { key: 'dataDescription', label: 'Deskripsi / Isi Data', type: 'textarea', required: true, placeholder: 'Paste atau jelaskan datanya di sini...' },
      { key: 'analysisGoal', label: 'Tujuan Analisis', type: 'textarea', required: true, placeholder: 'Apa yang ingin diketahui dari data ini...' },
    ],
  },
  formal_letter: {
    label: 'Surat / Email Resmi',
    description: 'Surat resmi atau email formal untuk korespondensi akademik',
    fields: [
      { key: 'letterType', label: 'Jenis', type: 'select', required: true,
        options: [{ value: 'letter', label: 'Surat Resmi' }, { value: 'email', label: 'Email Formal' }] },
      { key: 'recipient', label: 'Ditujukan Kepada', type: 'text', required: true, placeholder: 'cth: Dekan Fakultas Teknologi Pertanian UGM' },
      { key: 'purpose', label: 'Tujuan / Perihal', type: 'text', required: true, placeholder: 'cth: Permohonan surat keterangan untuk pengajuan visa' },
      { key: 'mainContent', label: 'Isi Utama', type: 'textarea', required: true, placeholder: 'Poin-poin yang harus ada dalam surat/email...' },
      { key: 'sender', label: 'Pengirim', type: 'text', required: false, placeholder: 'cth: Dr. Andri Prima Nugroho, SARC UGM' },
    ],
  },
}

// ─── Generator Prompt Builder ─────────────────────────────────────────────

export function buildGeneratorPrompt(
  docType: DocumentType,
  fields: Record<string, string>
): string {
  const config = DOCUMENT_TYPE_CONFIGS[docType]

  const fieldSummary = config.fields
    .filter(f => fields[f.key]?.trim())
    .map(f => `${f.label}: ${fields[f.key]}`)
    .join('\n')

  const baseInstruction = `Kamu adalah asisten penulisan akademik SmartAgri SARC UGM.
Tugas kamu adalah membuat dokumen berkualitas tinggi berdasarkan informasi yang diberikan.
Gunakan Bahasa Indonesia yang profesional kecuali diminta menggunakan Bahasa Inggris.
Hasilkan HANYA dokumennya saja — tanpa penjelasan tambahan, tanpa kalimat pembuka seperti "Berikut adalah..."

`

  const prompts: Record<DocumentType, string> = {
    activity_report: `${baseInstruction}Buat Laporan Kegiatan resmi dengan struktur:
1. PENDAHULUAN (latar belakang kegiatan)
2. PELAKSANAAN KEGIATAN (detail waktu, tempat, peserta, aktivitas)
3. HASIL DAN PEMBAHASAN (temuan, capaian, data yang relevan)
4. KESIMPULAN DAN REKOMENDASI
5. PENUTUP

Informasi kegiatan:
${fieldSummary}

${fields.language === 'en' ? 'Write the entire document in English.' : 'Tulis seluruh dokumen dalam Bahasa Indonesia formal.'}`,

    news_article: `${baseInstruction}Buat artikel berita ilmiah populer untuk website SmartAgri SARC UGM.
Struktur: Lead yang kuat → Body informatif (3-5 paragraf) → Penutup berkesan.
Tone: ${fields.tone === 'formal' ? 'formal dan berwibawa' : 'semi-formal, mudah dibaca'}.
Panjang target: ${fields.length === 'short' ? '~300 kata' : fields.length === 'medium' ? '~600 kata' : '~1000 kata'}.

Informasi artikel:
${fieldSummary}

${fields.language === 'en' ? 'Write in English.' : fields.language === 'both' ? 'Tulis versi Bahasa Indonesia dulu, lalu English translation di bawahnya dengan separator "---".' : 'Tulis dalam Bahasa Indonesia.'}`,

    research_proposal: `${baseInstruction}Buat Draft Proposal Penelitian dengan struktur:
1. JUDUL PENELITIAN
2. LATAR BELAKANG
3. RUMUSAN MASALAH
4. TUJUAN PENELITIAN
5. MANFAAT PENELITIAN
6. TINJAUAN PUSTAKA (ringkasan teori dan penelitian terkait, 3-5 paragraf)
7. METODE PENELITIAN
8. LUARAN YANG DIHARAPKAN
9. DAFTAR PUSTAKA (placeholder jika tidak ada referensi spesifik)

Informasi penelitian:
${fieldSummary}`,

    journal_abstract: `${baseInstruction}Buat abstrak jurnal ilmiah format IMRaD (200-250 kata).
Struktur dalam satu paragraf: Latar Belakang & Tujuan → Metode → Hasil Utama → Kesimpulan & Implikasi.
Gunakan kalimat aktif, hindari singkatan yang tidak umum, sertakan angka kunci dari hasil.

Informasi paper:
${fieldSummary}

${fields.language === 'en' ? 'Write the abstract in English.' : 'Tulis abstrak dalam Bahasa Indonesia.'}`,

    data_summary: `${baseInstruction}Buat ringkasan analisis data yang naratif dan informatif.
Struktur: Gambaran Umum Data → Tren Utama → Anomali atau Temuan Menarik → Interpretasi → Rekomendasi Tindak Lanjut.
Gunakan bahasa yang jelas, sertakan angka spesifik jika ada dalam data.

Informasi data:
${fieldSummary}`,

    formal_letter: `${baseInstruction}Buat ${fields.letterType === 'letter' ? 'surat resmi' : 'email formal'} yang profesional.
${fields.letterType === 'letter' ? 'Gunakan format surat resmi Indonesia: kop surat (tulis [KOP SURAT SARC UGM]), nomor surat [___/___/___/____], perihal, salam pembuka, isi, salam penutup, tanda tangan.' : 'Format email: Subject, Salam, Isi (3-4 paragraf), Penutup, Tanda tangan.'}

Informasi surat:
${fieldSummary}`,
  }

  return prompts[docType]
}
