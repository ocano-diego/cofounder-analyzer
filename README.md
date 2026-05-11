# YC Co-Founder Analyzer

A Chrome extension that helps you triage co-founder profiles on
[Y Combinator's Startup School co-founder matching](https://www.startupschool.org/cofounder-matching)
using Claude or Gemini. You describe your project once; the extension distills
what matters, then scores every profile you visit against those dimensions —
instantly, with cited evidence.

> Built with [WXT](https://wxt.dev) + React + TypeScript. MIT licensed.

## What it does

- **Distills evaluation dimensions** from your project description. Paste a
  blurb about your idea, your strengths, and what you're missing — the model
  proposes 5–8 weighted dimensions to look for in a co-founder.
- **Scores profiles in one click.** Open a candidate on YC, open the side
  panel, click *Analyze* — get a verdict (Worth it / Maybe / Skip), a 0–100
  score, and a row-by-row breakdown with green-check / red-x / gray-question
  icons.
- **Caches up to 20 evaluations.** Skip back to a previous profile and the
  result is already there. No re-running, no re-paying.
- **Exports the whole session** as Markdown — your context, dimensions,
  requirements, every evaluation, and the raw profile texts. Paste it into
  any AI chat to ask follow-up questions ("which of these had the strongest
  GTM background?").
- **BYO API key.** Works with Anthropic Claude or Google Gemini. Pick a
  model from the live model list. Keys live in `chrome.storage.local`,
  never leave your browser except to the provider's API.

## Install (load unpacked)

1. Clone and build:
   ```sh
   git clone https://github.com/ocano-diego/cofounder-analyzer.git
   cd cofounder-analyzer
   npm install
   npm run build
   ```
2. Open `chrome://extensions`, enable **Developer mode** (top-right).
3. Click **Load unpacked**, pick `.output/chrome-mv3`.
4. Visit any [startupschool.org/cofounder-matching](https://www.startupschool.org/cofounder-matching)
   page. An orange **YC Analyzer** pill appears top-right — click it to open
   the side panel. (Or click the toolbar icon directly.)

## Quick start

1. Open the side panel. Paste your **Anthropic** or **Gemini** API key in the
   *API key* section. Click the refresh icon to load the live model list.
2. In *Project context*, describe your project in plain text. Vision, audience,
   why you're building it, what kind of co-founder you need.
3. In *Dimensions*, click **Generate from context**. Reorder the proposed
   dimensions — #1 weighs the most.
4. (Optional) Add hard requirements like "based in NYC" or "has shipped a
   consumer mobile app".
5. Navigate to a candidate profile → click **Analyze this profile**.

## Development

```sh
npm install
npm run dev        # auto-opens Chrome with the extension loaded + HMR
npm run compile    # tsc --noEmit
npm run build      # production build to .output/chrome-mv3
```

WXT handles the manifest, content-script injection, and shadow-root UI
plumbing. See the [WXT docs](https://wxt.dev) for the broader system.

## Architecture

```
entrypoints/
  background.ts          service worker; URL-scopes the side panel,
                         dispatches API calls, handles OPEN_SIDEPANEL
  content/index.ts       6 KB vanilla TS: floating pill on YC pages +
                         profile scraper that responds to runtime messages
  sidepanel/             React UI — settings, dimensions, requirements,
                         profile evaluation, cache, session export
utils/
  anthropic.ts           Claude messages + models list
  gemini.ts              Gemini generateContent + models list
  llm.ts                 provider-agnostic prompts + JSON repair
  scrape.ts              extracts candidate profile text from YC DOM
  storage.ts             chrome.storage.local wrapper with migration
  export.ts              builds the Markdown session export
  types.ts               shared types
components/Icon.tsx      gradient SVG status icons + verdict badge
```

The side panel is **enabled per-tab**. On non-startupschool.org tabs,
`chrome.sidePanel.setOptions({ enabled: false })` runs and the toolbar
icon does nothing. On YC tabs the panel is enabled and the action click
opens it.

The content script never holds any UI of its own beyond the pill — it
exists to scrape the candidate DOM and broadcast `PROFILE_CHANGED`
messages, which the side panel listens to so it stays in sync with
whichever profile you're viewing.

## Privacy

This extension is BYO API key. The only network requests it makes are:

- `api.anthropic.com` — when you use Claude
- `generativelanguage.googleapis.com` — when you use Gemini

Your API key, project context, dimensions, requirements, and cached
evaluations are stored in `chrome.storage.local` on your machine. Nothing
is sent to any server operated by the author of this extension.

The list of allowed hosts is declared in `wxt.config.ts`. You can audit
exactly which network calls are possible by inspecting `utils/anthropic.ts`
and `utils/gemini.ts`.

## Customizing for other matching platforms

The DOM scraper lives in `utils/scrape.ts:findCandidateRoot`. It looks for
YC's `CofounderMatchingCandidate` React component marker, with a fallback to
the nearest tabular ancestor of an `<h1>`. To target a different matching
platform, replace that function and update the host in `wxt.config.ts`
+ the `ALLOWED_HOST` constant in `entrypoints/background.ts`.

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for
development setup, coding style, and the PR process.

## License

MIT — see [LICENSE](./LICENSE).
