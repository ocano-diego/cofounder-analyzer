export type Dimension = {
  id: string;
  label: string;
  why: string;
  priority: number;
};

export type Requirement = {
  id: string;
  text: string;
};

export type Provider = 'anthropic' | 'gemini';

export type ExtensionSettings = {
  provider: Provider;
  anthropicApiKey: string;
  anthropicModel: string;
  geminiApiKey: string;
  geminiModel: string;
  contextText: string;
  dimensions: Dimension[];
  requirements: Requirement[];
  evaluations: CachedEvaluation[];
};

export type EvaluationStatus = 'met' | 'unknown' | 'not_met';

export type EvaluationRow = {
  id: string;
  kind: 'dimension' | 'requirement';
  label: string;
  status: EvaluationStatus;
  reason: string;
};

export type Verdict = 'worth_it' | 'maybe' | 'skip';

export type ProfileEvaluation = {
  verdict: Verdict;
  score: number;
  summary: string;
  rows: EvaluationRow[];
};

export type CachedEvaluation = {
  key: string;
  name: string;
  profileText: string;
  evaluation: ProfileEvaluation;
  createdAt: number;
};

export const MAX_CACHED_EVALUATIONS = 20;

export type ModelInfo = { id: string; displayName: string };

export type ProfilePayload = {
  name: string;
  text: string;
  key: string;
};

export type BgRequest =
  | { type: 'ANALYZE_CONTEXT' }
  | { type: 'EVALUATE_PROFILE'; profileText: string }
  | { type: 'LIST_MODELS'; provider: Provider }
  | { type: 'OPEN_SIDEPANEL' }
  | { type: 'PROFILE_CHANGED'; profile: ProfilePayload | null };

export type ContentRequest = { type: 'GET_PROFILE' };

export type BgResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: 'Claude',
  gemini: 'Gemini',
};
