// functions/api/fx.js  — Cloudflare Pages Function, serves /api/fx
// Live USD -> JPY exchange rate as JSON: { rate, date, source }
// Two free, key-less sources with automatic fallback. Cached 6h in the browser.

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=21600",
  "Access-Control-Allow-Origin": "*"
};

async function fromFrankfurter() {
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

export async function onRequest() {
  for (const get of [fromFrankfurter, fromErApi]) {
    try {
      const out = await get();
      return new Response(JSON.stringify(out), { headers: HEADERS });
    } catch (e) { /* try the next source */ }
  }
  return new Response(JSON.stringify({ error: "fx_unavailable" }), {
    status: 502,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
