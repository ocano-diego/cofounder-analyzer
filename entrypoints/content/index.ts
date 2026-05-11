import { extractProfileText, observeProfileChanges, profileKey } from '../../utils/scrape';
import type { ContentRequest, ProfilePayload } from '../../utils/types';

export default defineContentScript({
  matches: ['https://www.startupschool.org/*'],
  runAt: 'document_end',
  main() {
    mountPill();
    wireProfileMessaging();
  },
});

function currentProfile(): ProfilePayload | null {
  const p = extractProfileText();
  if (!p) return null;
  return { name: p.name, text: p.text, key: profileKey(p.name, p.text) };
}

function wireProfileMessaging(): void {
  const broadcast = () => {
    chrome.runtime.sendMessage({ type: 'PROFILE_CHANGED', profile: currentProfile() }).catch(() => {
      /* side panel may not be open */
    });
  };
  broadcast();
  observeProfileChanges(broadcast);

  chrome.runtime.onMessage.addListener((msg: ContentRequest, _sender, sendResponse) => {
    if (msg.type === 'GET_PROFILE') {
      sendResponse(currentProfile());
      return false;
    }
    return false;
  });
}

function mountPill(): void {
  if (document.getElementById('cofounder-analyzer-pill-host')) return;
  const host = document.createElement('div');
  host.id = 'cofounder-analyzer-pill-host';
  host.style.cssText =
    'all: initial; position: fixed; top: 16px; right: 16px; z-index: 2147483646;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    .pill {
      background: linear-gradient(135deg, #f06827, #e94c1c);
      color: #fff;
      border: 0;
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(240, 104, 39, 0.4);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: box-shadow .15s;
    }
    .pill:hover { box-shadow: 0 8px 22px rgba(240, 104, 39, 0.5); }
    .pill svg { display: block; }
  `;
  shadow.appendChild(style);

  const btn = document.createElement('button');
  btn.className = 'pill';
  btn.type = 'button';
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden><path d="M12 2l1.8 5.8L19.5 9.5l-5.7 1.8L12 17l-1.8-5.7L4.5 9.5l5.7-1.7L12 2z" fill="currentColor"/></svg> CoFounder Analyzer`;
  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }).catch((err) => {
      console.warn('OPEN_SIDEPANEL failed', err);
    });
  });
  shadow.appendChild(btn);

  const attach = () => {
    if (document.body && !document.body.contains(host)) document.body.appendChild(host);
  };
  attach();
  new MutationObserver(attach).observe(document.documentElement, {
    childList: true,
    subtree: false,
  });
}
