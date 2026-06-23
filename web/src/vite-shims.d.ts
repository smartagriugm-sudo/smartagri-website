// Vite returns a URL string for `?url` imports (used for the pdf.js worker).
declare module '*?url' {
  const url: string
  export default url
}
