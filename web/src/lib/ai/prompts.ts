import type { DocumentType, DocumentTypeConfig } from './types'

// ─── Chat System Prompt ────────────────────────────────────────────────────

export const CHAT_SYSTEM_PROMPT = `You are the SmartAgri AI Research Assistant, the intelligent research assistant of the Smart Agriculture Research Center (SARC), Department of Agricultural and Biosystems Engineering (DTPB), Faculty of Agricultural Technology, Universitas Gadjah Mada (UGM), Yogyakarta, Indonesia.

Your areas of expertise:
- Precision agriculture and smart farming (IoT, sensors, automation)
- Drip irrigation and automated fertigation systems
- Smart greenhouses and plant factories (hydroponics, aeroponics, NFT)
- Hyperspectral imaging and computer vision for agriculture
- UAV / multispectral drones for land mapping
- Academic writing: scientific journals, research proposals, activity reports
- Agricultural and biosystems engineering research methodology

How you answer:
- Reply in the same language the user writes in; default to English.
- For technical questions, cite relevant scientific references or standards when possible.
- Structure answers clearly with headings, bullets, or numbering when appropriate.
- Be honest about limitations if a topic is outside your expertise.
- Do not fabricate data or references you are not confident about.`

// ─── Document Type Configs (for form fields) ──────────────────────────────

export const DOCUMENT_TYPE_CONFIGS: Record<DocumentType, DocumentTypeConfig> = {
  activity_report: {
    label: 'Activity Report',
    description: 'Official report of a field visit, monitoring, or deployment activity',
    fields: [
      { key: 'title', label: 'Activity Title', type: 'text', required: true, placeholder: 'e.g. Monitoring the Drip Irrigation System at KWT Teratai Mekar' },
      { key: 'date', label: 'Date & Location', type: 'text', required: true, placeholder: 'e.g. 15 June 2026, Condongcatur, Sleman' },
      { key: 'team', label: 'Team / Participants', type: 'text', required: false, placeholder: 'e.g. SARC UGM team (3 people)' },
      { key: 'description', label: 'Activity Description', type: 'textarea', required: true, placeholder: 'Describe what was done during the activity...' },
      { key: 'findings', label: 'Key Results & Findings', type: 'textarea', required: true, placeholder: 'What was found or achieved...' },
      { key: 'language', label: 'Output Language', type: 'select', required: true,
        options: [{ value: 'en', label: 'English' }, { value: 'id', label: 'Bahasa Indonesia' }] },
    ],
  },
  news_article: {
    label: 'News / SmartAgri Article',
    description: 'Popular science journalistic article for the SARC website',
    fields: [
      { key: 'title', label: 'Article Title', type: 'text', required: true, placeholder: 'e.g. SARC UGM Launches Automated Fertigation System in Sleman' },
      { key: 'event', label: 'Topic / Event Covered', type: 'text', required: true, placeholder: 'e.g. Launch of the RGBI 2026 program at KWT Teratai Mekar' },
      { key: 'keyPoints', label: 'Key Points', type: 'textarea', required: true, placeholder: 'List the main points to convey...' },
      { key: 'tone', label: 'Writing Tone', type: 'select', required: true,
        options: [{ value: 'formal', label: 'Formal' }, { value: 'semiformal', label: 'Semi-formal' }] },
      { key: 'length', label: 'Article Length', type: 'select', required: true,
        options: [{ value: 'short', label: 'Short (~300 words)' }, { value: 'medium', label: 'Standard (~600 words)' }, { value: 'long', label: 'Long (~1000 words)' }] },
      { key: 'language', label: 'Output Language', type: 'select', required: true,
        options: [{ value: 'en', label: 'English' }, { value: 'id', label: 'Bahasa Indonesia' }, { value: 'both', label: 'Bilingual (both)' }] },
    ],
  },
  research_proposal: {
    label: 'Research Proposal Draft',
    description: 'Academic research proposal outline',
    fields: [
      { key: 'title', label: 'Research Title', type: 'text', required: true, placeholder: 'e.g. IoT-Based Fertigation Optimization for Greenhouse Tomatoes' },
      { key: 'field', label: 'Field / Topic', type: 'text', required: true, placeholder: 'e.g. Irrigation Engineering, Smart Greenhouse, Horticulture' },
      { key: 'background', label: 'Brief Background', type: 'textarea', required: true, placeholder: 'What problem motivates this research...' },
      { key: 'objectives', label: 'Research Objectives', type: 'textarea', required: true, placeholder: 'What you aim to achieve...' },
      { key: 'methods', label: 'Planned Methods', type: 'textarea', required: false, placeholder: 'Research approach, tools, materials, procedures...' },
      { key: 'outputs', label: 'Target Outputs', type: 'text', required: false, placeholder: 'e.g. Scopus Q2 journal, system prototype, patent' },
    ],
  },
  journal_abstract: {
    label: 'Scientific Journal Abstract',
    description: '200-250 word IMRaD-format abstract draft for a paper',
    fields: [
      { key: 'title', label: 'Paper Title', type: 'text', required: true, placeholder: 'e.g. Hyperspectral-Based Stomatal Conductance Estimation...' },
      { key: 'background', label: 'Background / Problem', type: 'textarea', required: true, placeholder: 'What research gap is addressed...' },
      { key: 'methods', label: 'Methods', type: 'textarea', required: true, placeholder: 'Approach, dataset, algorithm, experiments...' },
      { key: 'results', label: 'Main Results', type: 'textarea', required: true, placeholder: 'Findings and key figures...' },
      { key: 'conclusion', label: 'Conclusion & Implications', type: 'textarea', required: true, placeholder: 'What it means and recommendations...' },
      { key: 'language', label: 'Output Language', type: 'select', required: true,
        options: [{ value: 'en', label: 'English' }, { value: 'id', label: 'Bahasa Indonesia' }] },
    ],
  },
  data_summary: {
    label: 'Data Summary & Analysis',
    description: 'Interpretive narrative of sensor, experiment, or survey data',
    fields: [
      { key: 'dataContext', label: 'Data Context', type: 'text', required: true, placeholder: 'e.g. Greenhouse temperature & humidity sensor data over 7 days' },
      { key: 'dataDescription', label: 'Data Description / Content', type: 'textarea', required: true, placeholder: 'Paste or describe the data here...' },
      { key: 'analysisGoal', label: 'Analysis Goal', type: 'textarea', required: true, placeholder: 'What you want to learn from this data...' },
    ],
  },
  formal_letter: {
    label: 'Official Letter / Email',
    description: 'Formal letter or email for academic correspondence',
    fields: [
      { key: 'letterType', label: 'Type', type: 'select', required: true,
        options: [{ value: 'letter', label: 'Official Letter' }, { value: 'email', label: 'Formal Email' }] },
      { key: 'recipient', label: 'Addressed To', type: 'text', required: true, placeholder: 'e.g. Dean, Faculty of Agricultural Technology UGM' },
      { key: 'purpose', label: 'Purpose / Subject', type: 'text', required: true, placeholder: 'e.g. Request for a reference letter for a visa application' },
      { key: 'mainContent', label: 'Main Content', type: 'textarea', required: true, placeholder: 'Points that must appear in the letter/email...' },
      { key: 'sender', label: 'Sender', type: 'text', required: false, placeholder: 'e.g. Dr. Andri Prima Nugroho, SARC UGM' },
    ],
  },
}

// ─── Generator Prompt Builder ─────────────────────────────────────────────

export function buildGeneratorPrompt(
  docType: DocumentType,
  fields: Record<string, string>,
): string {
  const config = DOCUMENT_TYPE_CONFIGS[docType]

  const fieldSummary = config.fields
    .filter((f) => fields[f.key]?.trim())
    .map((f) => `${f.label}: ${fields[f.key]}`)
    .join('\n')

  const baseInstruction = `You are the SmartAgri SARC UGM academic writing assistant.
Your task is to produce a high-quality document from the information provided.
Write in English unless explicitly asked to use Bahasa Indonesia.
Output ONLY the document itself, with no extra explanation and no opening lines such as "Here is...".

`

  const prompts: Record<DocumentType, string> = {
    activity_report: `${baseInstruction}Create an official Activity Report with this structure:
1. INTRODUCTION (background of the activity)
2. ACTIVITY EXECUTION (time, place, participants, activities)
3. RESULTS AND DISCUSSION (findings, achievements, relevant data)
4. CONCLUSION AND RECOMMENDATIONS
5. CLOSING

Activity information:
${fieldSummary}

${fields.language === 'id' ? 'Write the entire document in formal Bahasa Indonesia.' : 'Write the entire document in formal English.'}`,

    news_article: `${baseInstruction}Write a popular science news article for the SmartAgri SARC UGM website.
Structure: a strong lead, an informative body (3-5 paragraphs), and a memorable closing.
Tone: ${fields.tone === 'formal' ? 'formal and authoritative' : 'semi-formal and easy to read'}.
Target length: ${fields.length === 'short' ? '~300 words' : fields.length === 'medium' ? '~600 words' : '~1000 words'}.

Article information:
${fieldSummary}

${fields.language === 'id' ? 'Write in Bahasa Indonesia.' : fields.language === 'both' ? 'Write the English version first, then the Bahasa Indonesia translation below it, separated by "---".' : 'Write in English.'}`,

    research_proposal: `${baseInstruction}Create a Research Proposal Draft with this structure:
1. RESEARCH TITLE
2. BACKGROUND
3. PROBLEM STATEMENT
4. RESEARCH OBJECTIVES
5. SIGNIFICANCE OF THE RESEARCH
6. LITERATURE REVIEW (summary of theory and related work, 3-5 paragraphs)
7. RESEARCH METHODS
8. EXPECTED OUTPUTS
9. REFERENCES (use placeholders if no specific references are given)

Research information:
${fieldSummary}`,

    journal_abstract: `${baseInstruction}Write a scientific journal abstract in IMRaD format (200-250 words).
Single paragraph flow: Background & Objective, Methods, Main Results, Conclusion & Implications.
Use active voice, avoid uncommon abbreviations, and include key figures from the results.

Paper information:
${fieldSummary}

${fields.language === 'id' ? 'Write the abstract in Bahasa Indonesia.' : 'Write the abstract in English.'}`,

    data_summary: `${baseInstruction}Write a narrative, informative data analysis summary.
Structure: Data Overview, Main Trends, Anomalies or Interesting Findings, Interpretation, Follow-up Recommendations.
Use clear language and include specific figures if they are present in the data.

Data information:
${fieldSummary}`,

    formal_letter: `${baseInstruction}Write a professional ${fields.letterType === 'letter' ? 'official letter' : 'formal email'}.
${fields.letterType === 'letter' ? 'Use a formal letter format: letterhead (write [SARC UGM LETTERHEAD]), letter number [___/___/___/____], subject, salutation, body, closing, and signature.' : 'Email format: Subject, Greeting, Body (3-4 paragraphs), Closing, and Signature.'}

Letter information:
${fieldSummary}`,
  }

  return prompts[docType]
}
