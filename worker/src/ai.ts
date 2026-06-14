const GEMINI_MODEL = 'gemini-2.5-flash';

const PURCHASE_CATEGORIES = [
  'Wood', 'Screws & Nails', 'LEDs', 'Paint & Finish',
  'Tools', 'Electricity', 'Shipping', 'Other',
] as const;

const PARSE_SCHEMA = {
  type: 'object',
  properties: {
    transcript: { type: 'string', description: 'What the user said or typed, in original language' },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['income', 'purchase', 'wage', 'withdrawal'] },
          desc: { type: 'string' },
          name: { type: 'string' },
          worker: { type: 'string' },
          amount: { type: 'number' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          category: { type: 'string', enum: [...PURCHASE_CATEGORIES] },
          supplier: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['type', 'amount'],
      },
    },
  },
  required: ['entries'],
};

export interface AiBackend {
  geminiApiKey?: string;
  ai?: Ai;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]!;
}

function parseSystemPrompt(lang: 'en' | 'ar'): string {
  const today = todayIso();
  const categories = PURCHASE_CATEGORIES.join(', ');
  if (lang === 'ar') {
    return `You parse Arabic (and mixed Arabic/English) voice or text commands for a wood workshop finance app in Jordan.
Currency is JD (Jordanian Dinar). Today is ${today}.
Map phrases: شراء/مشتريات → purchase, إيراد/دخل → income, أجر/راتب → wage, سحب → withdrawal.
Extract item name, amount, supplier, note, category for purchases. Valid categories: ${categories}.
Default date to ${today} if not specified. Return JSON only.
Examples:
- "شراء خشب 120 دينار ملاحظة من مورد أحمد" → purchase name=خشب amount=120 note=من مورد أحمد category=Wood
- "إيراد 500 من زبون محمد" → income desc=زبون محمد amount=500`;
  }
  return `You parse English text/voice commands for a wood workshop finance app in Jordan.
Currency is JD. Today is ${today}. Valid purchase categories: ${categories}.
Default date to ${today} if not specified. Return JSON only.`;
}

function missingGeminiError(): Error {
  return new Error(
    'Gemini API key not set on worker. Run: cd worker && npx wrangler secret put GEMINI_API_KEY',
  );
}

async function callGemini(
  backend: AiBackend,
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  systemInstruction: string,
  responseSchema: object,
): Promise<string> {
  const payload = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.2,
    },
  };

  let res: Response | null = null;

  if (backend.geminiApiKey) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${backend.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  } else if (backend.ai) {
    const base = await backend.ai.gateway('default').getUrl('google-ai-studio');
    res = await fetch(
      `${base.replace(/\/$/, '')}/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  } else {
    throw missingGeminiError();
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (!backend.geminiApiKey && (res.status === 401 || res.status === 403)) {
      throw missingGeminiError();
    }
    throw new Error(errText || `Gemini error ${res.status}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

export interface ParseRequest {
  lang: 'en' | 'ar';
  text?: string;
  audioBase64?: string;
  audioMimeType?: string;
}

export interface ParsedEntry {
  type: 'income' | 'purchase' | 'wage' | 'withdrawal';
  desc?: string;
  name?: string;
  worker?: string;
  amount: number;
  date?: string;
  category?: string;
  supplier?: string;
  note?: string;
}

export interface ParseResponse {
  transcript?: string;
  entries: ParsedEntry[];
}

export async function parseEntries(backend: AiBackend, req: ParseRequest): Promise<ParseResponse> {
  if (!backend.geminiApiKey && !backend.ai) throw missingGeminiError();
  if (!req.text?.trim() && !req.audioBase64) throw new Error('Provide text or audio');

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  if (req.audioBase64) {
    parts.push({
      inlineData: {
        mimeType: req.audioMimeType ?? 'audio/mp4',
        data: req.audioBase64,
      },
    });
    parts.push({
      text: req.lang === 'ar'
        ? 'استمع إلى الصوت واستخرج سجلات المالية (شراء، إيراد، أجر، سحب) مع المبالغ بالدينار.'
        : 'Listen to the audio and extract finance entries with amounts in JD.',
    });
  } else {
    parts.push({ text: req.text!.trim() });
  }

  const raw = await callGemini(backend, parts, parseSystemPrompt(req.lang), PARSE_SCHEMA);
  const parsed = JSON.parse(raw) as ParseResponse;

  const entries = (parsed.entries ?? []).map(e => ({
    ...e,
    date: e.date ?? todayIso(),
    amount: Number(e.amount),
  })).filter(e => e.amount > 0 && ['income', 'purchase', 'wage', 'withdrawal'].includes(e.type));

  return {
    transcript: parsed.transcript,
    entries,
  };
}

export interface SummarizeRequest {
  lang: 'en' | 'ar';
  periodLabel: string;
  totals: {
    income: number;
    purchases: number;
    wages: number;
    withdrawals: number;
    net: number;
  };
  lines: string[];
}

async function callGeminiText(backend: AiBackend, prompt: string): Promise<string> {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
  };

  let res: Response | null = null;

  if (backend.geminiApiKey) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${backend.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  } else if (backend.ai) {
    const base = await backend.ai.gateway('default').getUrl('google-ai-studio');
    res = await fetch(
      `${base.replace(/\/$/, '')}/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  } else {
    throw missingGeminiError();
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (!backend.geminiApiKey && (res.status === 401 || res.status === 403)) {
      throw missingGeminiError();
    }
    throw new Error(errText || `Gemini error ${res.status}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Empty summary');
  return text;
}

export async function summarizePeriod(backend: AiBackend, req: SummarizeRequest): Promise<string> {
  if (!backend.geminiApiKey && !backend.ai) throw missingGeminiError();

  const prompt = req.lang === 'ar'
    ? `لخص أداء الورشة المالية للفترة "${req.periodLabel}" بالعربية في 3-5 جمل واضحة للصاحب.
الإيرادات: ${req.totals.income} JD، المشتريات: ${req.totals.purchases}، الأجور: ${req.totals.wages}، السحوبات: ${req.totals.withdrawals}، الصافي: ${req.totals.net} JD.
السجلات:\n${req.lines.join('\n')}`
    : `Summarize this workshop finances for "${req.periodLabel}" in 3-5 clear sentences.
Income: ${req.totals.income} JD, Purchases: ${req.totals.purchases}, Wages: ${req.totals.wages}, Withdrawals: ${req.totals.withdrawals}, Net: ${req.totals.net} JD.
Entries:\n${req.lines.join('\n')}`;

  return callGeminiText(backend, prompt);
}
