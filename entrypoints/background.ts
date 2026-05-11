import { listClaudeModels } from '../utils/anthropic';
import { listGeminiModels } from '../utils/gemini';
import { analyzeContext, evaluateProfile } from '../utils/llm';
import { loadSettings, saveSettings } from '../utils/storage';
import type { BgRequest, BgResponse, Dimension } from '../utils/types';

const SIDEPANEL_PATH = 'sidepanel.html';
const ALLOWED_HOST = 'www.startupschool.org';

function isAllowed(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === ALLOWED_HOST;
  } catch {
    return false;
  }
}

async function syncPanelForTab(tabId: number, url: string | undefined): Promise<void> {
  try {
    if (isAllowed(url)) {
      await chrome.sidePanel.setOptions({ tabId, path: SIDEPANEL_PATH, enabled: true });
    } else {
      await chrome.sidePanel.setOptions({ tabId, enabled: false });
    }
  } catch (err) {
    console.warn('sidePanel.setOptions failed', err);
  }
}

export default defineBackground(() => {
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('setPanelBehavior failed', err));

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) void syncPanelForTab(tab.id, tab.url);
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.url || info.status === 'complete') {
      void syncPanelForTab(tabId, tab.url);
    }
  });

  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    try {
      const tab = await chrome.tabs.get(tabId);
      await syncPanelForTab(tabId, tab.url);
    } catch (err) {
      console.warn('onActivated lookup failed', err);
    }
  });

  chrome.runtime.onMessage.addListener((msg: BgRequest, sender, sendResponse) => {
    if (msg.type === 'OPEN_SIDEPANEL') {
      const tabId = sender.tab?.id;
      const windowId = sender.tab?.windowId;
      if (tabId == null && windowId == null) {
        sendResponse({ ok: false, error: 'No tab to open side panel against' } satisfies BgResponse);
        return false;
      }
      const opts = tabId != null ? { tabId, windowId } : { windowId: windowId! };
      chrome.sidePanel.open(opts).then(
        () => {
          if (tabId != null) {
            chrome.sidePanel
              .setOptions({ tabId, path: SIDEPANEL_PATH, enabled: true })
              .catch((err) => console.warn('post-open setOptions failed', err));
          }
          sendResponse({ ok: true, data: null } satisfies BgResponse);
        },
        (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.warn('sidePanel.open failed', message);
          sendResponse({ ok: false, error: message } satisfies BgResponse);
        },
      );
      return true;
    }

    if (msg.type === 'PROFILE_CHANGED') {
      // Side panel listens directly; nothing to do in background.
      sendResponse({ ok: true, data: null } satisfies BgResponse);
      return false;
    }

    handle(msg)
      .then((data) => sendResponse({ ok: true, data } satisfies BgResponse))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        sendResponse({ ok: false, error: message } satisfies BgResponse);
      });
    return true;
  });
});

async function handle(msg: BgRequest): Promise<unknown> {
  const settings = await loadSettings();

  if (msg.type === 'LIST_MODELS') {
    if (msg.provider === 'anthropic') {
      if (!settings.anthropicApiKey) throw new Error('Add your Anthropic API key first.');
      return await listClaudeModels(settings.anthropicApiKey);
    }
    if (!settings.geminiApiKey) throw new Error('Add your Gemini API key first.');
    return await listGeminiModels(settings.geminiApiKey);
  }

  if (msg.type === 'ANALYZE_CONTEXT') {
    const dims = await analyzeContext(settings, settings.contextText);
    const dimensions: Dimension[] = dims.map((d, i) => ({
      id: `d-${Date.now()}-${i}`,
      label: d.label,
      why: d.why,
      priority: i,
    }));
    await saveSettings({ dimensions });
    return dimensions;
  }

  if (msg.type === 'EVALUATE_PROFILE') {
    if (settings.dimensions.length === 0 && settings.requirements.length === 0) {
      throw new Error('Configure dimensions or requirements first.');
    }
    return await evaluateProfile({
      settings,
      contextText: settings.contextText,
      dimensions: settings.dimensions,
      requirements: settings.requirements,
      profileText: msg.profileText,
    });
  }

  throw new Error('Unknown request');
}
