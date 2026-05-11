import type { ModelInfo } from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODELS_URL = 'https://api.anthropic.com/v1/models';
const ANTHROPIC_VERSION = '2023-06-01';

export async function listClaudeModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(`${MODELS_URL}?limit=1000`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Anthropic /models ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    data?: { id: string; display_name?: string }[];
  };
  return (json.data ?? []).map((m) => ({
    id: m.id,
    displayName: m.display_name ?? m.id,
  }));
}

type MessagesResponse = {
  content: { type: string; text?: string }[];
};

export async function callClaude(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as MessagesResponse;
  const text = json.content.find((c) => c.type === 'text')?.text ?? '';
  if (!text) throw new Error('Empty response from Claude');
  return text;
}
