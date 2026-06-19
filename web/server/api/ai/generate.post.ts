import { defineEventHandler, getRequestHeader, readBody } from 'h3'
import {
  DOCUMENT_TYPE_CONFIGS,
  buildGeneratorPrompt,
} from '../../../src/lib/ai/prompts'
import { jsonResponse, streamChatCompletion } from '../../../src/lib/ai/ollama'
import { isAuthorized } from '../../../src/lib/ai/auth-guard'
import type { DocumentType } from '../../../src/lib/ai/types'

const VALID_DOC_TYPES = Object.keys(DOCUMENT_TYPE_CONFIGS) as DocumentType[]

// POST /api/ai/generate — proxy for the document generator.
export default defineEventHandler(async (event) => {
  if (!(await isAuthorized(getRequestHeader(event, 'authorization')))) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const body = (await readBody(event).catch(() => null)) as {
    docType?: unknown
    fields?: unknown
  } | null

  const docType = body?.docType
  const fields = body?.fields

  if (
    typeof docType !== 'string' ||
    typeof fields !== 'object' ||
    fields === null ||
    Array.isArray(fields)
  ) {
    return jsonResponse({ error: 'docType and fields are required' }, 400)
  }

  if (!VALID_DOC_TYPES.includes(docType as DocumentType)) {
    return jsonResponse({ error: 'Invalid document type' }, 400)
  }

  const prompt = buildGeneratorPrompt(
    docType as DocumentType,
    fields as Record<string, string>,
  )

  return streamChatCompletion([{ role: 'user', content: prompt }])
})
