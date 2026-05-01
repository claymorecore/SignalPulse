// scanner/live.js
import market from "../../market/state.js";
import binance from "../../binance/client.js";
import locks from "../locks.js";
import { log } from "../../middleware/log.js";
import { updateLive } from "../../services/signals.service.js";

export async function pollLive({ cfg, runningRef }) {
  if (!runningRef()) return;
  if (locks.isLocked("live")) return;

  locks.lock("live", 30000);

  try {
    const open = market.listSignals(5000).filter((s) => s?.status === "OPEN");
    if (!open.length) {
      market.setLiveCount(0);
      return;
    }

    const prices = await binance.fetchAllPrices(cfg.pxMode);
    market.setLiveCount(prices.size || 0);

    for (const sig of open) {
      const p = prices.get(sig.symbol);
      if (!Number.isFinite(p)) continue;

      // qty is now stored on the signal itself
      await updateLive(sig, p, undefined, { emit: false });
    }

    market.emitState();

    log.debug("LIVE_POLL", {
      signals: open.length,
      pxMode: cfg.pxMode,
      prices: prices.size
    });
  } catch (e) {
    log.warn("LIVE_POLL_FAIL", { err: e?.message || String(e) });
  } finally {
    locks.unlock("live");
  }
}

export default { pollLive };