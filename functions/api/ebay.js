// functions/api/ebay.js  — Cloudflare Pages Function, serves /api/ebay
// Live US-market comparison price from eBay's Browse API (free tier).
// ?q=<set name> -> median asking price of sealed booster-box listings on eBay US (USD).
//
// ── ONE-TIME SETUP ────────────────────────────────────────────────────────
// In your Cloudflare Pages project: Settings -> Variables and secrets, add
// (for Production):
//   EBAY_CLIENT_ID      = your eBay App ID (Client ID)
//   EBAY_CLIENT_SECRET  = your eBay Cert ID (Client Secret)  [mark as a secret]
// then redeploy. Until set, returns { ok:false, reason:"not_configured" } and the
// tool simply keeps its manual comparison input — nothing breaks.
//
// Note: these are ASKING prices (active listings), a little above true sold prices.

const OAUTH_URL  = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

// token cached across warm invocations so we don't re-auth every call
let cachedToken = null;
let tokenExpiry = 0;

async function getToken(id, secret) {
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;
  const basic = btoa(id + ":" + secret); // Cloudflare runtime: use btoa, not Buffer
  const body = "grant_type=client_credentials&scope=" +
    encodeURIComponent("https://api.ebay.com/oauth/api_scope");
  const r = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + basic
    },
    body
  });
  if (!r.ok) throw new Error("oauth_" + r.status);
  const j = await r.json();
  cachedToken = j.access_token;
  tokenExpiry = Date.now() + (j.expires_in || 7200) * 1000;
  return cachedToken;
}

// keep single sealed boxes; drop packs, singles, lots, graded cards, ETBs, etc.
const BAD  = /\b(pack|packs|single|singles|card|cards|promo|sleeve|case|lot|bundle|empty|graded|psa|cgc|bgs|proxy|blister|tin|etb|elite\s*trainer|deck|x\s*[2-9])\b/i;
const GOOD = /\bbox\b/i;

function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const json = (obj, extra) =>
  new Response(JSON.stringify(obj), {
    headers: Object.assign(
      { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      extra || {}
    )
  });

export async function onRequest(context) {
  const id = context.env.EBAY_CLIENT_ID;
  const secret = context.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return json({ ok: false, reason: "not_configured" });

  const q = (new URL(context.request.url).searchParams.get("q") || "").trim();
  if (!q) return json({ ok: false, reason: "no_query" });

  // "Terastal Festival ex (sv8a)" -> "Terastal Festival ex japanese booster box sealed"
  const cleaned = q.replace(/\([^)]*\)/g, "")
                   .replace(/[\u2014\u2013]/g, " ")
                   .replace(/\s+/g, " ").trim();
  const query = cleaned + " japanese booster box sealed";

  try {
    const token = await getToken(id, secret);
    const url = SEARCH_URL +
      "?q=" + encodeURIComponent(query) +
      "&limit=60&sort=price" +
      "&filter=" + encodeURIComponent("buyingOptions:{FIXED_PRICE},priceCurrency:USD,price:[20..900]");
    const r = await fetch(url, {
      headers: {
        "Authorization": "Bearer " + token,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json"
      }
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      return json({ ok: false, reason: "search_" + r.status, detail });
    }

    const data = await r.json();
    const prices = (data.itemSummaries || [])
      .filter(it => it.title && GOOD.test(it.title) && !BAD.test(it.title))
      .map(it => parseFloat(it.price && it.price.value))
      .filter(v => v > 0);

    if (prices.length < 3) {
      return json({ ok: false, reason: "no_results", matched: prices.length },
        { "Cache-Control": "public, max-age=600" });
    }

    // trim the cheapest/priciest ~15% before taking the median
    const sorted = prices.slice().sort((a, b) => a - b);
    const cut = Math.floor(sorted.length * 0.15);
    const core = sorted.slice(cut, sorted.length - cut);
    const use = core.length ? core : sorted;

    return json({
      ok: true,
      q: cleaned,
      count: prices.length,
      median: Math.round(median(use)),
      low: Math.round(use[0]),
      high: Math.round(use[use.length - 1]),
      currency: "USD"
    }, { "Cache-Control": "public, max-age=3600" });
  } catch (e) {
    return json({ ok: false, reason: String(e.message || e) });
  }
}
