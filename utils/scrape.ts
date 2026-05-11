export function profileKey(name: string, text: string): string {
  const sample = (name + '|' + text.slice(0, 500)).replace(/\s+/g, ' ');
  let h = 5381;
  for (let i = 0; i < sample.length; i++) h = ((h << 5) + h + sample.charCodeAt(i)) >>> 0;
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40)}-${h.toString(36)}`;
}

function findCandidateRoot(): HTMLElement | null {
  const scripts = document.querySelectorAll('script');
  for (const s of Array.from(scripts)) {
    const text = s.textContent ?? '';
    if (!text.includes('CofounderMatchingCandidate')) continue;
    const m = text.match(/divId:\s*["']([^"']+)["']/);
    if (m) {
      const el = document.getElementById(m[1]);
      if (el) return el;
    }
  }
  const h1 = document.querySelector('h1');
  if (h1) {
    let node: HTMLElement | null = h1;
    for (let i = 0; i < 8 && node; i++) {
      if (node.querySelector('table')) return node;
      node = node.parentElement;
    }
  }
  return null;
}

export function isCandidatePage(): boolean {
  return /\/cofounder-matching\/(candidate|saved-profiles|skipped-profiles)/.test(
    location.pathname,
  ) || findCandidateRoot() !== null;
}

export function extractProfileText(): { name: string; text: string } | null {
  const root = findCandidateRoot();
  if (!root) return null;
  const name = root.querySelector('h1')?.textContent?.trim() ?? 'Candidate';
  const clone = root.cloneNode(true) as HTMLElement;
  for (const sel of ['button', 'textarea', 'svg', 'script', 'noscript']) {
    clone.querySelectorAll(sel).forEach((n) => n.remove());
  }
  const text = (clone.innerText || clone.textContent || '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  return { name, text };
}

export function observeProfileChanges(cb: () => void): () => void {
  let lastName: string | null = null;
  let lastPath = location.pathname;
  const check = () => {
    const profile = extractProfileText();
    const path = location.pathname;
    if (path !== lastPath || (profile && profile.name !== lastName)) {
      lastPath = path;
      lastName = profile?.name ?? null;
      cb();
    }
  };
  const obs = new MutationObserver(() => {
    check();
  });
  obs.observe(document.body, { childList: true, subtree: true });
  const interval = window.setInterval(check, 1500);
  return () => {
    obs.disconnect();
    window.clearInterval(interval);
  };
}
