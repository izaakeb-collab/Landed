# LANDED

A landed-cost calculator for importing Japanese sealed trading-card product into the US.
Tells you your true per-box cost (product + proxy fees + shipping + duty + processing) and
whether importing actually beats buying domestic — including the **break-even quantity**.

## What's in here

```
landed/
├─ index.html                  # the whole app (HTML + CSS + JS, no build step)
├─ netlify.toml                # publish dir, functions dir, /api/fx route
└─ netlify/
   └─ functions/
      └─ fx.mjs                # live USD→JPY rate (cached 6h), with fallback source
```

## Features

- **Live exchange rate.** On load, the app calls `/api/fx` and auto-fills the rate
  (ECB via Frankfurter, falling back to open.er-api). The result is cached at Netlify's
  edge for 6 hours, so the function rarely re-runs. If the fetch fails, the app quietly
  falls back to the value in the field.
- **Shareable links.** The "Copy shareable link" button encodes every input into the URL
  (e.g. `?p=9000&q=6&fx=150&r=export&...`). Open that link and the calculator restores the
  exact scenario. Great for pasting a result into a Discord/Reddit thread.

## Deploy (free)

1. Push this folder to a GitHub repo.
2. In Netlify: **Add new site → Import from Git**, pick the repo. No build command needed;
   publish directory is `.`. Netlify auto-detects the `netlify/functions` folder.
3. Done. The live rate works in production at `/api/fx`.

Or from the CLI: `npm i -g netlify-cli` then `netlify deploy --prod`.

## Local testing

`netlify dev` runs the functions locally so `/api/fx` works on `localhost`.
Opening `index.html` directly (file://) works for everything **except** the live rate —
there's no function server, so it falls back to the manual rate. That's expected.

## Notes

- Duty defaults to 10% (Section 122, current for Japan as of mid-2026) — scheduled to expire
  ~July 24, 2026, so confirm the live rate before ordering. This is a planning tool, not
  customs advice.
- The app is a single ~45 KB file, so Netlify's free bandwidth easily covers very high traffic.
  The only metered cost is the `fx` function, which is cached to near-zero invocations.

## Next ideas

- Per-set Japanese price lookup (pick a set → auto-fill the yen price). Biggest friction-killer
  and the natural paid hook.
- Weight-based shipping estimator.
- Email capture ("notify me when the tariff changes") via Netlify Forms.
