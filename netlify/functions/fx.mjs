// netlify/functions/fx.mjs
// Returns the live USD -> JPY exchange rate as JSON: { rate, date, source }
// Cached at Netlify's edge for 6h so this rarely re-runs (keeps free-tier usage tiny).
// Uses two free, key-less sources with automatic fallback.

const HEADERS = {
  "Content-Type": "application/json",
  // Browser cache + Netlify durable edge cache. FX updates ~daily, so 6h is plenty.
  "Cache-Control": "public, max-age=21600",
  "Netlify-CDN-Cache-Control": "public, durable, max-age=21600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*"
};

async function fromFrankfurter() {
  // ECB reference rates, includes JPY
  const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=JPY");
  if (!r.ok) throw new Error("frankfurter " + r.status);
  const d = await r.json();
  const rate = d && d.rates && d.rates.JPY;
  if (!rate) throw new Error("frankfurter no rate");
  return { rate, date: d.date || null, source: "ECB" };
}

async function fromErApi() {
  const r = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!r.ok) throw new Error("er-api " + r.status);
  const d = await r.json();
  const rate = d && d.rates && d.rates.JPY;
  if (!rate) throw new Error("er-api no rate");
  const date = d.time_last_update_utc ? d.time_last_update_utc.slice(0, 16) : null;
  return { rate, date, source: "er-api" };
}

export default async () => {
  for (const get of [fromFrankfurter, fromErApi]) {
    try {
      const out = await get();
      return new Response(JSON.stringify(out), { headers: HEADERS });
    } catch (e) {
      // try the next source
    }
  }
  return new Response(JSON.stringify({ error: "fx_unavailable" }), {
    status: 502,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
};
