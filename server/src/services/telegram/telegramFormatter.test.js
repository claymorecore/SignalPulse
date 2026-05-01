import assert from "node:assert/strict";
import test from "node:test";

import { renderSignalTelegramText } from "./telegramFormatter.js";

test("renderSignalTelegramText returns plain structured signal text", () => {
  const text = renderSignalTelegramText({
    symbol: "BTCUSDT",
    side: "LONG",
    setup: "EMA_ATR",
    entry: 61234.5,
    sl: 60500,
    tp: 62650,
    rr: 2,
    status: "OPEN",
    live: 61420.2,
    pnlPct: 0.3,
    pnlUsdt: 12.34,
    createdAt: 1_000
  }, { now: 61_000 });

  assert.match(text, /^Symbol: BTCUSDT/m);
  assert.match(text, /^Side: LONG/m);
  assert.match(text, /^Setup: EMA_ATR/m);
  assert.match(text, /^Entry: 61234.5000/m);
  assert.match(text, /^SL: 60500.0000/m);
  assert.match(text, /^TP: 62650.0000/m);
  assert.match(text, /^RR: 2.00/m);
  assert.match(text, /^Status: OPEN/m);
  assert.match(text, /^Live price: 61420.2000/m);
  assert.match(text, /^PnL %: 0.30%/m);
  assert.match(text, /^PnL USDT: 12.34/m);
  assert.match(text, /^Age: 1m 0s/m);
  assert.equal(text.includes("{"), false);
  assert.equal(text.includes("}"), false);
});