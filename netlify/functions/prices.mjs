// netlify/functions/prices.mjs
// Serves the Japanese sealed-box price list as JSON, cached at the edge.
//
// This is the single source of truth the front-end fetches on load. Prices are
// ballpark Japanese-market estimates (yen), ~mid-2026 — edit them here and every
// visitor gets the update with no front-end redeploy.
//
// TO GO FULLY LIVE: replace the static SETS below with a call to a price source
// (e.g. PriceCharting's API using a key stored in a Netlify environment variable),
// map the response into the same { g, items:[{ n, y }] } shape, and return it.
// The front-end needs zero changes.

const UPDATED = "Jun 2026";

const SETS = [
  { g: "Mega Evolution era", items: [
    { n: "Ninja Spinner \u2014 Mega Greninja (M4)", y: 9000 },
    { n: "Nihil Zero (M3)", y: 7000 },
    { n: "Inferno X \u2014 Mega Charizard X (M2)", y: 8500 },
    { n: "Mega Symphonia (M1S)", y: 7500 },
    { n: "Mega Brave (M1L)", y: 7500 },
    { n: "Mega Dream ex (High Class Pack)", y: 9500 }
  ]},
  { g: "Scarlet & Violet \u2014 high-class & specials", items: [
    { n: "Pok\u00e9mon Card 151 (sv2a)", y: 15000 },
    { n: "Shiny Treasure ex (sv4a)", y: 12000 },
    { n: "Terastal Festival ex (sv8a)", y: 10000 }
  ]},
  { g: "Scarlet & Violet \u2014 expansions", items: [
    { n: "Black Bolt (sv11b)", y: 7500 },
    { n: "White Flare (sv11w)", y: 7500 },
    { n: "The Glory of Team Rocket (sv10)", y: 11000 },
    { n: "Heat Wave Arena \u2014 Charizard (sv9a)", y: 9000 },
    { n: "Battle Partners (sv9)", y: 6500 },
    { n: "Super Electric Breaker (sv8)", y: 6500 },
    { n: "Paradise Dragona (sv7a)", y: 6500 },
    { n: "Stella Miracle (sv7)", y: 6000 },
    { n: "Night Wanderer (sv6a)", y: 6000 },
    { n: "Mask of Change (sv6)", y: 6000 },
    { n: "Crimson Haze (sv5a)", y: 6500 },
    { n: "Cyber Judge (sv5M)", y: 6000 },
    { n: "Wild Force (sv5K)", y: 6000 },
    { n: "Ancient Roar (sv4K)", y: 6500 },
    { n: "Future Flash (sv4M)", y: 6500 },
    { n: "Raging Surf (sv3a)", y: 7000 },
    { n: "Ruler of the Black Flame (sv3)", y: 7000 },
    { n: "Snow Hazard (sv2P)", y: 7500 },
    { n: "Clay Burst \u2014 Iono (sv2D)", y: 18000 },
    { n: "Triplet Beat (sv1a)", y: 8000 },
    { n: "Violet ex (sv1V)", y: 7000 },
    { n: "Scarlet ex (sv1S)", y: 7000 }
  ]}
];

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=21600",
  "Netlify-CDN-Cache-Control": "public, durable, max-age=21600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*"
};

export default async () => {
  return new Response(JSON.stringify({ updated: UPDATED, estimate: true, sets: SETS }), { headers: HEADERS });
};
