# X Region Blocker

A personal Chrome extension for x.com that:

- shows a **Region Badge** (🇮🇳 India, 🌐 South Asia, ? unknown, ⚠ possibly inaccurate) beside every account as you scroll;
- adds a one-click **Hand Block** (🚫, with a 5-second Undo) and **Never block** (🛡) to every post and profile;
- automatically Blocks accounts matching your **Region Rules** (starts with India, Pakistan and Nigeria), skipping accounts you follow, accounts marked Never block, accounts you unblocked, and regions X flags as possibly inaccurate;
- keeps a **Block Log** in the popup with Unblock per entry and "Undo all from this rule".

Terms are defined in [GLOSSARY.md](GLOSSARY.md).

## Install

### From a release (no build needed)

1. Download `x-region-blocker.zip` from the [latest release](../../releases/latest) and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose the unzipped folder.

### From source

```bash
npm install
npm run build
```

Then in Chrome: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose the `dist` folder. After rebuilding, click the reload icon on the extension's card.

## Things to know

- **Lookups are slow on purpose.** X allows roughly 50 region lookups per 15 minutes (unofficial figure). Lookups go one at a time, on-screen accounts first, and pause when X's allowance runs low. Every region is cached permanently in Chrome storage (including "no region"), and a cached account is never looked up again, however often it appears. To force a fresh lookup, remove and reinstall the extension, which clears its cache. The cache is per Chrome profile, so badges get faster the more you use it. While the limit is reached, waiting badges show ⏳ with the time lookups resume.
- **Rule blocks are uncapped.** A broad rule on a busy feed can block many accounts quickly, which X may treat as automation (silently dropped blocks, logouts, locks).
- **Rule changes apply going forward.** Accounts already on screen are not re-checked; reload the page to apply a new rule to them.
- **Unblocking from the popup** needs an x.com tab open, because it uses that tab's signed-in session.
- **X's private API is undocumented** and changes. The parts most likely to break are in `src/content/xApi.ts`: the `AboutAccountQuery` lookup (its query id is read from X's scripts, with a fallback), the accuracy flag field, `friendships/show` for "do I follow them", and `blocks/create` / `blocks/destroy`.

## Development

```bash
npm test
npm run typecheck
```

Tests drive the page code against a fake X (`test/fakes.ts`) and in-memory storage.
