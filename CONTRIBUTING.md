# Contributing

Thanks for your interest. Issues, bug reports, and PRs are all welcome.

## Development setup

```sh
git clone https://github.com/ocano-diego/cofounder-analyzer.git
cd cofounder-analyzer
npm install
npm run dev
```

`npm run dev` launches Chrome with the extension loaded and HMR wired up.
Edits to React code under `entrypoints/sidepanel/` and `components/` hot-reload
without a full extension reload; edits to the service worker (`background.ts`)
or content script (`content/index.ts`) trigger an extension reload automatically.

Before opening a PR, run:

```sh
npm run compile    # type-check
npm run build      # production build, catches Vite/WXT issues
```

## Testing manually

There are no automated tests yet. To verify a change:

1. Build and load `.output/chrome-mv3` as an unpacked extension.
2. Sign in to startupschool.org/cofounder-matching.
3. Walk through the quick-start flow in the [README](./README.md#quick-start).
4. Open the service-worker DevTools (`chrome://extensions` → *Inspect views:
   service worker*) and confirm no console errors.

If you're touching the DOM scraper, paste a representative chunk of the
candidate page's HTML and walk through `findCandidateRoot` / `extractProfileText`
manually — the scrape is the most platform-coupled part of the codebase
and the class names rotate.

## Coding style

- TypeScript strict mode. No `any` unless you can justify it in a comment.
- Two-space indent, single quotes, trailing commas (matches the existing files).
- No comments that restate what the code does. Comment the *why* when it
  isn't obvious — hidden constraints, browser quirks, prompt-engineering choices.
- Keep new dependencies to a minimum. The whole thing is currently React + WXT
  and nothing else; please justify additions.

## What's in scope

- Better profile scraping (specific selectors, structured extraction)
- Additional LLM providers (OpenAI, Mistral, local Ollama, etc.)
- Better dimensions UX (drag-to-reorder, weights, templates)
- Performance (the content script bundle is already small; the side panel
  could be code-split)
- i18n / RTL support

## What's out of scope

- A backend. This is BYO-key by design; we don't run an API.
- Profile data collection or analytics. No telemetry will be added.
- Auto-messaging, auto-skip, or anything that interacts with the matching
  site on your behalf. The extension is read-only with respect to the site.

## Releasing

Currently no automated release. Bump `package.json` and `wxt.config.ts`
`version`, update [CHANGELOG.md](./CHANGELOG.md), tag the commit, push.
A Chrome Web Store listing may come later.

## License

By contributing you agree your contributions are licensed under the project's
[MIT License](./LICENSE).
