const newsItems = [
  {
    id: "liquidity-repricing",
    slug: "liquidity-repricing",
    title: "Liquidity is repricing toward majors again",
    summary: "Capital is concentrating in the highest-liquidity pairs, which matters more than isolated altcoin spikes.",
    context: "Useful when evaluating whether follow-through is broad enough to trust directional setups.",
    category: "Market structure",
    publishedAt: "2026-04-11T07:30:00.000Z",
    source: "SignalPulse Desk"
  },
  {
    id: "volatility-compression",
    slug: "volatility-compression",
    title: "Volatility is compressing ahead of the next impulse window",
    summary: "Compression is reducing random range expansion and making validation cues more important than frequency.",
    context: "A lower-volatility tape usually favors patience, cleaner entries, and stronger invalidation discipline.",
    category: "Volatility",
    publishedAt: "2026-04-11T06:15:00.000Z",
    source: "SignalPulse Desk"
  },
  {
    id: "btc-dominance-shift",
    slug: "btc-dominance-shift",
    title: "BTC dominance remains the clearest institutional risk gauge",
    summary: "When dominance rises while breadth weakens, alt participation often deserves stricter filtering.",
    context: "Helpful for deciding whether to widen watchlists or stay concentrated in the strongest majors.",
    category: "Breadth",
    publishedAt: "2026-04-10T17:00:00.000Z",
    source: "SignalPulse Desk"
  }
];

export const listNews = () => newsItems.slice();

export const getNewsBySlug = (slugOrId) =>
  newsItems.find((item) => item.slug === slugOrId || item.id === slugOrId) || null;
