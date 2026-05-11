import { callClaude } from './anthropic';
import { callGemini } from './gemini';
import type {
  Dimension,
  ExtensionSettings,
  ProfileEvaluation,
  Requirement,
} from './types';

type CallOpts = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
};

function selectClient(settings: ExtensionSettings): {
  call: (opts: CallOpts) => Promise<string>;
  apiKey: string;
  model: string;
  label: string;
} {
  if (settings.provider === 'gemini') {
    if (!settings.geminiApiKey) throw new Error('Add your Gemini API key first.');
    return {
      call: callGemini,
      apiKey: settings.geminiApiKey,
      model: settings.geminiModel,
      label: 'Gemini',
    };
  }
  if (!settings.anthropicApiKey) throw new Error('Add your Anthropic API key first.');
  return {
    call: callClaude,
    apiKey: settings.anthropicApiKey,
    model: settings.anthropicModel,
    label: 'Claude',
  };
}

function extractJson<T>(raw: string): T {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : raw;
  const start = candidate.indexOf('{');
  const arrStart = candidate.indexOf('[');
  let begin = start;
  if (arrStart !== -1 && (begin === -1 || arrStart < begin)) begin = arrStart;
  if (begin === -1) {
    throw new Error(`No JSON found in model response: ${raw.slice(0, 200)}`);
  }
  const slice = candidate.slice(begin);
  const open = slice[0];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  let lastCompleteItem = -1;
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0 && ch === close) {
        end = i + 1;
        break;
      }
      if (depth === 1 && open === '[' && ch === '}') {
        lastCompleteItem = i + 1;
      }
    }
  }
  if (end !== -1) return JSON.parse(slice.slice(0, end)) as T;

  if (open === '[' && lastCompleteItem > 0) {
    const repaired = slice.slice(0, lastCompleteItem) + ']';
    try {
      return JSON.parse(repaired) as T;
    } catch {
      /* fall through */
    }
  }
  throw new Error(
    `Truncated JSON from model (likely hit token limit). First 300 chars: ${slice.slice(0, 300)}`,
  );
}

const CONTEXT_SYSTEM = `You are an expert YC co-founder matching analyst. The user will share a description of their project, vision, and what they need. Your job: distill the 5-8 most important dimensions they should evaluate prospective co-founders on.

Return a strict JSON array. Each item: { "label": "<short dimension name, 2-5 words>", "why": "<one sentence on why this matters for THIS project>" }.

Order by importance, most important first. No prose outside the JSON. No code fences.`;

export async function analyzeContext(
  settings: ExtensionSettings,
  contextText: string,
): Promise<{ label: string; why: string }[]> {
  if (!contextText.trim()) throw new Error('Add some project context first.');
  const client = selectClient(settings);
  const trimmed = contextText.slice(0, 120_000);
  const user = `Here is my project context. Identify the dimensions I should evaluate co-founder candidates against.\n\n${trimmed}`;
  const raw = await client.call({
    apiKey: client.apiKey,
    model: client.model,
    system: CONTEXT_SYSTEM,
    user,
    maxTokens: 4000,
  });
  return extractJson<{ label: string; why: string }[]>(raw);
}

const EVAL_SYSTEM = `You are an expert co-founder vetting analyst. The user will share:
1. Their project context (markdown).
2. A prioritized list of dimensions (most important first).
3. Custom hard requirements (optional).
4. A YC co-founder candidate's profile text.

Evaluate the candidate against EACH dimension and EACH requirement. For each, output a status:
- "met" — clear positive evidence in the profile
- "not_met" — clear negative evidence or strong absence
- "unknown" — profile doesn't say enough to judge

Then produce an overall verdict:
- "worth_it" — strong fit, the user should reach out
- "maybe" — partial fit, depends on user's tolerance
- "skip" — clearly poor fit on top priorities

Return STRICT JSON, no prose, no code fences:
{
  "verdict": "worth_it" | "maybe" | "skip",
  "score": <0-100 integer>,
  "summary": "<one sentence, max 30 words>",
  "dimensions": [{ "label": "<exact label from input>", "status": "met"|"unknown"|"not_met", "reason": "<<=15 words citing profile evidence>" }],
  "requirements": [{ "text": "<exact text from input>", "status": "met"|"unknown"|"not_met", "reason": "<<=15 words>" }]
}

Score weighting: top-priority dimensions matter most. A "not_met" on the #1 priority should drag the score down hard. Be honest, not generous.`;

export async function evaluateProfile(opts: {
  settings: ExtensionSettings;
  contextText: string;
  dimensions: Dimension[];
  requirements: Requirement[];
  profileText: string;
}): Promise<ProfileEvaluation> {
  const client = selectClient(opts.settings);
  const ctx = opts.contextText.slice(0, 60_000);
  const dims = opts.dimensions
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((d, i) => `${i + 1}. ${d.label} — ${d.why}`)
    .join('\n');
  const reqs = opts.requirements.length
    ? opts.requirements.map((r, i) => `${i + 1}. ${r.text}`).join('\n')
    : '(none)';
  const user = `# My project context
${ctx || '(none provided)'}

# Dimensions (priority order, #1 = most important)
${dims || '(none)'}

# Hard requirements
${reqs}

# Candidate profile
${opts.profileText.slice(0, 30_000)}`;
  const raw = await client.call({
    apiKey: client.apiKey,
    model: client.model,
    system: EVAL_SYSTEM,
    user,
    maxTokens: 4000,
  });
  type RawResp = {
    verdict: ProfileEvaluation['verdict'];
    score: number;
    summary: string;
    dimensions: { label: string; status: ProfileEvaluation['rows'][number]['status']; reason: string }[];
    requirements: { text: string; status: ProfileEvaluation['rows'][number]['status']; reason: string }[];
  };
  const parsed = extractJson<RawResp>(raw);
  const dimMap = new Map(opts.dimensions.map((d) => [d.label.toLowerCase(), d]));
  const reqMap = new Map(opts.requirements.map((r) => [r.text.toLowerCase(), r]));
  const rows: ProfileEvaluation['rows'] = [];
  for (const d of parsed.dimensions ?? []) {
    const match = dimMap.get(d.label.toLowerCase());
    rows.push({
      id: match?.id ?? `dim-${rows.length}`,
      kind: 'dimension',
      label: match?.label ?? d.label,
      status: d.status,
      reason: d.reason,
    });
  }
  for (const r of parsed.requirements ?? []) {
    const match = reqMap.get(r.text.toLowerCase());
    rows.push({
      id: match?.id ?? `req-${rows.length}`,
      kind: 'requirement',
      label: match?.text ?? r.text,
      status: r.status,
      reason: r.reason,
    });
  }
  return {
    verdict: parsed.verdict,
    score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 0))),
    summary: parsed.summary ?? '',
    rows,
  };
}
