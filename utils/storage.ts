import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_GEMINI_MODEL,
  type ExtensionSettings,
} from './types';

const KEY = 'settings_v1';

const empty: ExtensionSettings = {
  provider: 'anthropic',
  anthropicApiKey: '',
  anthropicModel: DEFAULT_ANTHROPIC_MODEL,
  geminiApiKey: '',
  geminiModel: DEFAULT_GEMINI_MODEL,
  contextText: '',
  dimensions: [],
  requirements: [],
  evaluations: [],
};

type LegacySettings = Partial<ExtensionSettings> & {
  apiKey?: string;
  model?: string;
  contextFiles?: { name: string; content: string }[];
};

function migrate(stored: LegacySettings | undefined): ExtensionSettings {
  if (!stored) return empty;
  const next = { ...empty, ...stored };
  if (stored.apiKey && !stored.anthropicApiKey) next.anthropicApiKey = stored.apiKey;
  if (stored.model && !stored.anthropicModel && /claude/i.test(stored.model)) {
    next.anthropicModel = stored.model;
  }
  if (!stored.contextText && stored.contextFiles?.length) {
    next.contextText = stored.contextFiles
      .map((f) => `--- ${f.name} ---\n${f.content}`)
      .join('\n\n');
  }
  return next;
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(KEY);
  return migrate(result[KEY] as LegacySettings | undefined);
}

export async function saveSettings(patch: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

export function onSettingsChanged(cb: (s: ExtensionSettings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local' || !changes[KEY]) return;
    cb(migrate(changes[KEY].newValue as LegacySettings | undefined));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
