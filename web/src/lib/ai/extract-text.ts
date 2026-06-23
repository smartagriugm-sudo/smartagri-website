// Client-side text extraction for uploaded files. Heavy parsers (pdf.js,
// mammoth, xlsx) are dynamically imported so they stay out of the main bundle
// and load only when a matching file is chosen.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// File types we can turn into plain text.
export const EXTRACT_ACCEPT =
  '.txt,.md,.markdown,.csv,.tsv,.json,.log,.yml,.yaml,.pdf,.docx,.xlsx,.xls'

export function isExtractable(name: string): boolean {
  return /\.(txt|md|markdown|csv|tsv|json|log|ya?ml|pdf|docx|xlsx|xls)$/i.test(name)
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = (await import('pdfjs-dist')) as unknown as {
    GlobalWorkerOptions: { workerSrc: string }
    getDocument: (opts: { data: Uint8Array }) => { promise: Promise<PdfDoc> }
  }
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  let out = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    out += content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n'
  }
  return out.trim()
}

interface PdfDoc {
  numPages: number
  getPage: (n: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<{ str?: string }> }>
  }>
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = (await import('mammoth')) as unknown as {
    extractRawText: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
  }
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return (result.value || '').trim()
}

async function extractXlsx(file: File): Promise<string> {
  const XLSX = (await import('xlsx')) as unknown as {
    read: (d: ArrayBuffer, o: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> }
    utils: { sheet_to_csv: (s: unknown) => string }
  }
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  return wb.SheetNames.map(
    (n) => `# ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`,
  )
    .join('\n\n')
    .trim()
}

// Returns the file's text. Throws if a parser fails.
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return extractPdf(file)
  if (name.endsWith('.docx')) return extractDocx(file)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return extractXlsx(file)
  return (await file.text()).trim()
}
