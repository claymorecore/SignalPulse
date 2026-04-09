// scanner/live.js
import market from "../../market/state.js";
import binance from "../../binance/client.js";
import locks from "../locks.js";
import { log } from "../../middleware/log.js";

const now = () => Date.now();

export async function pollLive({ cfg, runningRef }) {
  if (!runningRef()) return;
  if (locks.isLocked("live")) return;

  locks.lock("live", 30000);

  try {
    const open = market.listSignals(5000).filter(s => s?.status === "OPEN");
    if (!open.length) {
      market.setLiveCount(0);
      return;
    }

    const prices = await binance.fetchAllPrices(cfg.pxMode);
    market.setLiveCount(prices.size || 0);

    const effQty = (cfg.qty || 1) * (cfg.riskMult || 1);

    for (const sig of open) {
      const p = prices.get(sig.symbol);
      if (!Number.isFinite(p)) continue;

      const ts = now();

      sig.live = p;
      sig.lastLiveTs = ts;

      const per1 = sig.side === "LONG" ? p - sig.entry : sig.entry - p;
      sig.pnlUsdt = per1 * effQty;
      sig.pnlPct = sig.entry > 0 ? (per1 / sig.entry) * 100 : NaN;

      if (!Array.isArray(sig.history)) {
        sig.history = [];
      }

      sig.history.push({
        t: ts,
        p,
        pp: sig.pnlPct,
        u: sig.pnlUsdt
      });

      if (sig.history.length > 240) {
        sig.history.splice(0, sig.history.length - 240);
      }

      if (sig.status === "OPEN") {
        if (sig.side === "LONG") {
          if (p <= sig.sl) sig.status = "SL";
          else if (p >= sig.tp) sig.status = "TP";
        } else {
          if (p >= sig.sl) sig.status = "SL";
          else if (p <= sig.tp) sig.status = "TP";
        }
      }

      await market.upsertSignal(sig, { emit: false });
    }

    market.emitState();

    log.debug("LIVE_POLL", {
      signals: open.length,
      pxMode: cfg.pxMode,
      prices: prices.size,
      effQty
    });
  } catch (e) {
    log.warn("LIVE_POLL_FAIL", { err: e?.message || String(e) });
  } finally {
    locks.unlock("live");
  }
}

export default { pollLive };
