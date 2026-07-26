import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { getFileBufferFromStorage } from '../lib/storage.js';

export type TemplateType = 'invoice' | 'resume' | 'meeting' | 'custom';

export interface StructuredExtractInput {
  workspaceId: string;
  userId: string;
  documentId?: string | undefined;
  rawText?: string | undefined;
  templateType: TemplateType;
  customSchema?: string | undefined;
}

const TEMPLATE_PROMPTS: Record<TemplateType, string> = {
  invoice: `Extract invoice data and return JSON matching this exact structure:
{
  "vendorName": "string",
  "invoiceNumber": "string",
  "invoiceDate": "string",
  "dueDate": "string",
  "totalAmount": "number",
  "currency": "string",
  "lineItems": [
    { "description": "string", "quantity": "number", "unitPrice": "number", "total": "number" }
  ]
}`,
  resume: `Extract resume details and return JSON matching this exact structure:
{
  "candidateName": "string",
  "email": "string",
  "phone": "string",
  "summary": "string",
  "skills": ["string"],
  "experienceYears": "number",
  "workHistory": [
    { "company": "string", "role": "string", "duration": "string", "highlights": ["string"] }
  ],
  "education": [
    { "institution": "string", "degree": "string", "year": "string" }
  ]
}`,
  meeting: `Extract meeting summary and return JSON matching this exact structure:
{
  "title": "string",
  "date": "string",
  "participants": ["string"],
  "keyTopics": ["string"],
  "decisions": ["string"],
  "actionItems": [
    { "task": "string", "assignee": "string", "dueDate": "string" }
  ]
}`,
  custom: `Extract structured fields based on the requested custom JSON schema.`,
};

export async function extractStructuredData(input: StructuredExtractInput) {
  const { workspaceId, userId, documentId, rawText, templateType, customSchema } = input;

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) throw new AppError('Access denied', 403, 'FORBIDDEN');

  let textToExtract = rawText || '';

  if (documentId) {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: { chunks: { select: { content: true } } },
    });
    if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');

    if (doc.chunks.length > 0) {
      textToExtract = doc.chunks.map((c) => c.content).join('\n\n');
    } else {
      try {
        const buffer = await getFileBufferFromStorage(doc.fileKey);
        textToExtract = buffer.toString('utf-8');
      } catch {
        textToExtract = `Document: ${doc.name}`;
      }
    }
  }

  if (!textToExtract || textToExtract.trim().length === 0) {
    throw new AppError('No document text or raw text provided for extraction', 400, 'INVALID_INPUT');
  }

  const apiKey = process.env['GROQ_API_KEY'];
  const isRealApiKey = apiKey && apiKey.startsWith('gsk_') && !apiKey.includes('your_groq_api_key_here');

  if (!isRealApiKey) {
    throw new AppError('Groq API key is missing or invalid in server/.env', 500, 'AI_CONFIG_ERROR');
  }

  const templateGuidance = TEMPLATE_PROMPTS[templateType] || TEMPLATE_PROMPTS.invoice;
  const schemaInstructions = templateType === 'custom' && customSchema ? `Custom JSON Schema requirement: ${customSchema}` : templateGuidance;

  const systemPrompt = `You are a precise data extraction AI. Analyze the input document text and extract structured data as raw, valid JSON only. Do not include markdown code blocks or explanatory text. Return strictly raw valid JSON.

Extraction Rules:
${schemaInstructions}`;

  const baseUrl = (process.env['GROQ_BASE_URL'] || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');

  const response = await globalThis.fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `DOCUMENT TEXT:\n${textToExtract.slice(0, 15000)}` },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new AppError(`Groq extraction failed: ${errorBody}`, 500, 'AI_EXTRACTION_FAILED');
  }

  const jsonResponse = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawJsonStr = jsonResponse.choices?.[0]?.message?.content || '{}';

  try {
    const parsedData = JSON.parse(rawJsonStr);
    return {
      templateType,
      extractedData: parsedData,
      rawJson: rawJsonStr,
    };
  } catch {
    throw new AppError('Failed to parse AI response into valid JSON', 500, 'JSON_PARSING_FAILED');
  }
}
