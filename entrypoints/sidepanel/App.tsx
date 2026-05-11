import { useEffect, useMemo, useState } from 'react';
import {
  StatusIcon,
  VerdictBadge,
  SparkIcon,
  CloseIcon,
  ChevronIcon,
  CopyIcon,
} from '../../components/Icon';
import { loadSettings, onSettingsChanged, saveSettings } from '../../utils/storage';
import { buildSessionExport } from '../../utils/export';
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_GEMINI_MODEL,
  MAX_CACHED_EVALUATIONS,
  PROVIDER_LABELS,
} from '../../utils/types';
import type {
  BgResponse,
  CachedEvaluation,
  Dimension,
  ExtensionSettings,
  ModelInfo,
  ProfileEvaluation,
  ProfilePayload,
  Provider,
  Requirement,
} from '../../utils/types';
import './App.css';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

async function fetchProfileFromActiveTab(): Promise<ProfilePayload | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith('https://www.startupschool.org/')) return null;
  try {
    const res = (await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROFILE' })) as
      | ProfilePayload
      | null;
    return res ?? null;
  } catch {
    return null;
  }
}

type SectionProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
};

function Section({ title, open, onToggle, badge, children }: SectionProps) {
  return (
    <div className="yca-card">
      <button className="yca-card-head" onClick={onToggle} type="button">
        <span className="yca-card-title">{title}</span>
        {badge && <span className="yca-badge">{badge}</span>}
        <span className="yca-card-chev">
          <ChevronIcon size={14} dir={open ? 'up' : 'down'} />
        </span>
      </button>
      {open && <div className="yca-card-body">{children}</div>}
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [busyEval, setBusyEval] = useState(false);
  const [busyAnalyze, setBusyAnalyze] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<ProfileEvaluation | null>(null);
  const [newReq, setNewReq] = useState('');
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [models, setModels] = useState<Record<Provider, ModelInfo[] | null>>({
    anthropic: null,
    gemini: null,
  });
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      if (!s.anthropicApiKey && !s.geminiApiKey) setOpenSection('api');
    });
    return onSettingsChanged(setSettings);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const p = await fetchProfileFromActiveTab();
      if (active) setProfile(p);
    };
    refresh();

    const onMsg = (msg: { type: string; profile?: ProfilePayload | null }) => {
      if (msg.type === 'PROFILE_CHANGED') setProfile(msg.profile ?? null);
    };
    chrome.runtime.onMessage.addListener(onMsg);
    const onActivated = () => refresh();
    const onUpdated = (_id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (info.status === 'complete' || info.url) refresh();
    };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      active = false;
      chrome.runtime.onMessage.removeListener(onMsg);
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  const hasKey = useMemo(() => {
    if (!settings) return false;
    return settings.provider === 'anthropic'
      ? !!settings.anthropicApiKey
      : !!settings.geminiApiKey;
  }, [settings]);

  const ready = useMemo(
    () =>
      !!settings &&
      hasKey &&
      (settings.dimensions.length > 0 || settings.requirements.length > 0),
    [settings, hasKey],
  );

  const currentKey = settings
    ? settings.provider === 'anthropic'
      ? settings.anthropicApiKey
      : settings.geminiApiKey
    : '';

  const fetchModels = async (provider: Provider) => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const res: BgResponse<ModelInfo[]> = await chrome.runtime.sendMessage({
        type: 'LIST_MODELS',
        provider,
      });
      if (!res.ok) throw new Error(res.error);
      setModels((prev) => ({ ...prev, [provider]: res.data }));
    } catch (e) {
      setModelError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (openSection !== 'api' || !settings) return;
    if (!currentKey) return;
    if (models[settings.provider]) return;
    fetchModels(settings.provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSection, settings?.provider, currentKey]);

  useEffect(() => {
    if (!settings || !profile) {
      setEvaluation(null);
      return;
    }
    const cached = settings.evaluations.find((e) => e.key === profile.key);
    setEvaluation(cached ? cached.evaluation : null);
  }, [settings?.evaluations, profile?.key]);

  const isCached = useMemo(() => {
    if (!settings || !profile) return false;
    return settings.evaluations.some((e) => e.key === profile.key);
  }, [settings?.evaluations, profile?.key]);

  if (!settings) return <div className="yca-root">Loading…</div>;

  const update = async (patch: Partial<ExtensionSettings>) => {
    const next = await saveSettings(patch);
    setSettings(next);
  };

  const runAnalyzeContext = async () => {
    if (!hasKey) {
      setError(`Add your ${PROVIDER_LABELS[settings.provider]} API key first.`);
      setOpenSection('api');
      return;
    }
    if (!settings.contextText.trim()) {
      setError('Add some project context first.');
      setOpenSection('context');
      return;
    }
    setError(null);
    setNotice(null);
    setBusyAnalyze(true);
    try {
      const res: BgResponse<Dimension[]> = await chrome.runtime.sendMessage({
        type: 'ANALYZE_CONTEXT',
      });
      if (!res.ok) throw new Error(res.error);
      setNotice(`Generated ${res.data.length} dimensions.`);
      setOpenSection('dimensions');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAnalyze(false);
    }
  };

  const runEvaluation = async () => {
    if (!profile) {
      setError('No profile detected on the active tab.');
      return;
    }
    setBusyEval(true);
    setError(null);
    try {
      const res: BgResponse<ProfileEvaluation> = await chrome.runtime.sendMessage({
        type: 'EVALUATE_PROFILE',
        profileText: profile.text,
      });
      if (!res.ok) throw new Error(res.error);
      setEvaluation(res.data);
      const entry: CachedEvaluation = {
        key: profile.key,
        name: profile.name,
        profileText: profile.text,
        evaluation: res.data,
        createdAt: Date.now(),
      };
      const filtered = settings.evaluations.filter((e) => e.key !== entry.key);
      const nextList = [entry, ...filtered].slice(0, MAX_CACHED_EVALUATIONS);
      await update({ evaluations: nextList });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyEval(false);
    }
  };

  const copySession = async () => {
    const md = buildSessionExport(settings);
    try {
      await navigator.clipboard.writeText(md);
      setNotice(
        `Copied ${settings.evaluations.length} profile${
          settings.evaluations.length === 1 ? '' : 's'
        } + context to clipboard.`,
      );
      setTimeout(() => setNotice(null), 3000);
    } catch (e) {
      setError(`Could not copy: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const clearCache = async () => {
    await update({ evaluations: [] });
    setEvaluation(null);
    setNotice('Cleared cached evaluations.');
    setTimeout(() => setNotice(null), 2000);
  };

  const sortedDims = settings.dimensions.slice().sort((a, b) => a.priority - b.priority);

  const moveDim = async (idx: number, dir: -1 | 1) => {
    const arr = sortedDims.slice();
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    await update({ dimensions: arr.map((d, i) => ({ ...d, priority: i })) });
  };

  const deleteDim = async (id: string) => {
    const next = sortedDims.filter((d) => d.id !== id).map((d, i) => ({ ...d, priority: i }));
    await update({ dimensions: next });
  };

  const editDimLabel = async (id: string, label: string) => {
    await update({
      dimensions: settings.dimensions.map((d) => (d.id === id ? { ...d, label } : d)),
    });
  };

  const addRequirement = async () => {
    const text = newReq.trim();
    if (!text) return;
    const req: Requirement = { id: uid(), text };
    await update({ requirements: [...settings.requirements, req] });
    setNewReq('');
  };

  const deleteRequirement = async (id: string) => {
    await update({ requirements: settings.requirements.filter((r) => r.id !== id) });
  };

  const toggle = (key: string) => setOpenSection((cur) => (cur === key ? null : key));

  return (
    <div className="yca-root">
      <div className="yca-header">
        <div className="yca-title">
          <SparkIcon size={14} />
          <span>
            <span className="accent">Co</span>Founder Analyzer
          </span>
          {settings.evaluations.length > 0 && (
            <span className="yca-cache-count">{settings.evaluations.length}</span>
          )}
        </div>
        <div className="yca-header-actions">
          <button
            className="yca-iconbtn"
            onClick={copySession}
            aria-label="Copy session export"
            title="Copy session export to clipboard"
            disabled={!settings.contextText.trim() && settings.evaluations.length === 0}
          >
            <CopyIcon size={14} />
          </button>
        </div>
      </div>
      <div className="yca-body">
        {profile ? (
          <>
            <div className="yca-now">
              Reviewing <strong>{profile.name}</strong>
            </div>
            {ready && !evaluation && (
              <button className="yca-cta" onClick={runEvaluation} disabled={busyEval}>
                {busyEval ? <span className="yca-spinner" /> : <SparkIcon size={14} />}
                {busyEval ? 'Analyzing…' : 'Analyze this profile'}
              </button>
            )}
            {!ready && (
              <div className="yca-empty">
                {!hasKey
                  ? 'Add your API key below to get started.'
                  : 'Add context and generate dimensions below.'}
              </div>
            )}
          </>
        ) : (
          <div className="yca-empty">
            Open a candidate profile on startupschool.org to analyze it. Configure settings below
            at any time.
          </div>
        )}

        {error && <div className="yca-err">{error}</div>}
        {notice && <div className="yca-ok">{notice}</div>}

        {evaluation && (
          <>
            {isCached && (
              <div className="yca-cached-note">
                Cached result. <a onClick={runEvaluation}>Re-analyze</a>
              </div>
            )}
            <VerdictBadge verdict={evaluation.verdict} score={evaluation.score} />
            {evaluation.summary && <div className="yca-summary">{evaluation.summary}</div>}
            {evaluation.rows.some((r) => r.kind === 'dimension') && (
              <>
                <div className="yca-section-label">Dimensions</div>
                {evaluation.rows
                  .filter((r) => r.kind === 'dimension')
                  .map((r) => {
                    const dim = sortedDims.find((d) => d.id === r.id);
                    const pri = dim ? dim.priority + 1 : undefined;
                    return (
                      <div className={`yca-row ${r.status}`} key={r.id}>
                        <div className="icon">
                          <StatusIcon status={r.status} size={22} />
                        </div>
                        <div className="text">
                          <p className="label">
                            {pri && <span className="pri">#{pri}</span>}
                            {r.label}
                          </p>
                          <p className="reason">{r.reason}</p>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
            {evaluation.rows.some((r) => r.kind === 'requirement') && (
              <>
                <div className="yca-section-label">Requirements</div>
                {evaluation.rows
                  .filter((r) => r.kind === 'requirement')
                  .map((r) => (
                    <div className={`yca-row ${r.status}`} key={r.id}>
                      <div className="icon">
                        <StatusIcon status={r.status} size={22} />
                      </div>
                      <div className="text">
                        <p className="label">{r.label}</p>
                        <p className="reason">{r.reason}</p>
                      </div>
                    </div>
                  ))}
              </>
            )}
            <div className="yca-row-buttons">
              <button className="yca-quickbtn" onClick={runEvaluation} disabled={busyEval}>
                Re-run
              </button>
              <button className="yca-quickbtn" onClick={copySession} type="button">
                Copy session
              </button>
            </div>
          </>
        )}

        {settings.evaluations.length > 0 && (
          <div className="yca-cache-bar">
            <span>
              <strong>{settings.evaluations.length}</strong>/{MAX_CACHED_EVALUATIONS} profile
              {settings.evaluations.length === 1 ? '' : 's'} cached
            </span>
            <div className="yca-row-buttons">
              <button className="yca-quickbtn" onClick={copySession} type="button">
                <CopyIcon size={12} /> Copy
              </button>
              <button className="yca-quickbtn" onClick={clearCache} type="button">
                Clear
              </button>
            </div>
          </div>
        )}

        <Section
          title="API key"
          open={openSection === 'api'}
          onToggle={() => toggle('api')}
          badge={hasKey ? PROVIDER_LABELS[settings.provider] : 'set me'}
        >
          <div className="yca-seg">
            {(['anthropic', 'gemini'] as Provider[]).map((p) => (
              <button
                key={p}
                className={`yca-seg-btn ${settings.provider === p ? 'active' : ''}`}
                onClick={() => update({ provider: p })}
                type="button"
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>
          {settings.provider === 'anthropic' ? (
            <>
              <input
                className="yca-input"
                type="password"
                placeholder="sk-ant-..."
                value={settings.anthropicApiKey}
                onChange={(e) => update({ anthropicApiKey: e.target.value })}
              />
              <ModelPicker
                provider="anthropic"
                value={settings.anthropicModel}
                placeholder={DEFAULT_ANTHROPIC_MODEL}
                models={models.anthropic}
                loading={loadingModels}
                hasKey={!!settings.anthropicApiKey}
                onChange={(v) => update({ anthropicModel: v || DEFAULT_ANTHROPIC_MODEL })}
                onRefresh={() => fetchModels('anthropic')}
              />
              <p className="yca-hint">
                Stored locally. Sent only to api.anthropic.com.{' '}
                <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
                  Get a key
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <input
                className="yca-input"
                type="password"
                placeholder="AIza..."
                value={settings.geminiApiKey}
                onChange={(e) => update({ geminiApiKey: e.target.value })}
              />
              <ModelPicker
                provider="gemini"
                value={settings.geminiModel}
                placeholder={DEFAULT_GEMINI_MODEL}
                models={models.gemini}
                loading={loadingModels}
                hasKey={!!settings.geminiApiKey}
                onChange={(v) => update({ geminiModel: v || DEFAULT_GEMINI_MODEL })}
                onRefresh={() => fetchModels('gemini')}
              />
              <p className="yca-hint">
                Stored locally. Sent only to generativelanguage.googleapis.com.{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  Get a key
                </a>
                .
              </p>
            </>
          )}
          {modelError && <div className="yca-err">{modelError}</div>}
        </Section>

        <Section
          title="Project context"
          open={openSection === 'context'}
          onToggle={() => toggle('context')}
          badge={
            settings.contextText.trim()
              ? `${(settings.contextText.length / 1024).toFixed(1)}KB`
              : 'empty'
          }
        >
          <p className="yca-hint">
            What's your project? Vision, audience, why you're building it, and what kind of
            co-founder you need. Plain text. Paste from Notion / Docs.
          </p>
          <textarea
            className="yca-textarea"
            placeholder="My project is..."
            value={settings.contextText}
            onChange={(e) => update({ contextText: e.target.value })}
          />
          {settings.contextText.trim() && (
            <div className="yca-row-buttons">
              <button
                className="yca-quickbtn"
                onClick={() => update({ contextText: '' })}
                type="button"
              >
                Clear
              </button>
            </div>
          )}
        </Section>

        <Section
          title="Dimensions"
          open={openSection === 'dimensions'}
          onToggle={() => toggle('dimensions')}
          badge={sortedDims.length ? `${sortedDims.length}` : 'empty'}
        >
          <p className="yca-hint">#1 weighs the most. Reorder anytime.</p>
          <button
            className="yca-cta"
            onClick={runAnalyzeContext}
            disabled={busyAnalyze}
            type="button"
          >
            {busyAnalyze ? <span className="yca-spinner" /> : <SparkIcon size={14} />}
            {sortedDims.length === 0 ? 'Generate from context' : 'Regenerate'}
          </button>
          {sortedDims.map((d, i) => (
            <div className="yca-dim-row" key={d.id}>
              <div className="yca-num">{i + 1}</div>
              <div className="yca-dim-body">
                <input
                  className="yca-input"
                  value={d.label}
                  onChange={(e) => editDimLabel(d.id, e.target.value)}
                />
                <p className="yca-dim-why">{d.why}</p>
              </div>
              <div className="yca-dim-moves">
                <button
                  className="yca-iconbtn"
                  onClick={() => moveDim(i, -1)}
                  disabled={i === 0}
                  type="button"
                  aria-label="Move up"
                >
                  <ChevronIcon size={12} dir="up" />
                </button>
                <button
                  className="yca-iconbtn"
                  onClick={() => moveDim(i, 1)}
                  disabled={i === sortedDims.length - 1}
                  type="button"
                  aria-label="Move down"
                >
                  <ChevronIcon size={12} dir="down" />
                </button>
                <button
                  className="yca-iconbtn"
                  onClick={() => deleteDim(d.id)}
                  type="button"
                  aria-label="Delete"
                >
                  <CloseIcon size={11} />
                </button>
              </div>
            </div>
          ))}
        </Section>

        <Section
          title="Hard requirements"
          open={openSection === 'requirements'}
          onToggle={() => toggle('requirements')}
          badge={settings.requirements.length ? `${settings.requirements.length}` : 'empty'}
        >
          <p className="yca-hint">"based in NYC", "shipped a consumer app", etc.</p>
          <div className="yca-quick">
            <input
              className="yca-quickinput"
              placeholder="add a requirement"
              value={newReq}
              onChange={(e) => setNewReq(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addRequirement();
              }}
            />
            <button className="yca-quickbtn" onClick={addRequirement} type="button">
              Add
            </button>
          </div>
          {settings.requirements.map((r) => (
            <div className="yca-req-row" key={r.id}>
              <span className="text">{r.text}</span>
              <button
                className="yca-iconbtn"
                onClick={() => deleteRequirement(r.id)}
                type="button"
                aria-label="Remove"
              >
                <CloseIcon size={11} />
              </button>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function ModelPicker({
  value,
  placeholder,
  models,
  loading,
  hasKey,
  onChange,
  onRefresh,
}: {
  provider: Provider;
  value: string;
  placeholder: string;
  models: ModelInfo[] | null;
  loading: boolean;
  hasKey: boolean;
  onChange: (v: string) => void;
  onRefresh: () => void;
}) {
  const list = models ?? [];
  const inList = list.some((m) => m.id === value);
  const options = value && !inList ? [{ id: value, displayName: `${value} (custom)` }, ...list] : list;
  return (
    <div className="yca-quick">
      {models && models.length > 0 ? (
        <select
          className="yca-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="yca-input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <button
        className="yca-quickbtn"
        onClick={onRefresh}
        disabled={loading || !hasKey}
        type="button"
        title={hasKey ? 'Fetch available models' : 'Add an API key first'}
        aria-label="Refresh model list"
      >
        {loading ? '…' : '↻'}
      </button>
    </div>
  );
}
