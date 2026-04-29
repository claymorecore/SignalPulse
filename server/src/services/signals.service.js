// signals.service.js
import market from "../market/state.js";
import { resolveFixedPosition } from "../scanner/positionSizing.js";

const now = () => Date.now();
const isNum = (n) => Number.isFinite(n);

const isValidSide = (side) => side === "LONG" || side === "SHORT";

const isClosedStatus = (status) => {
  const st = String(status || "").trim().toUpperCase();
  return st === "TP" || st === "SL" || st === "CLOSED";
};

const resolvePosition = (sig) => {
  const position = resolveFixedPosition(sig?.entry);

  return {
    capitalUsd: position.capitalUsd,
    qty: position.qty
  };
};

const computePnL = (sig, price, qty) => {
  if (!sig || !isNum(sig.entry) || !isValidSide(sig.side) || !isNum(price) || !isNum(qty)) {
    return { pnlUsdt: NaN, pnlPct: NaN };
  }

  const perUnit = sig.side === "LONG"
    ? price - sig.entry
    : sig.entry - price;

  return {
    pnlUsdt: perUnit * qty,
    pnlPct: sig.entry > 0 ? (perUnit / sig.entry) * 100 : NaN
  };
};

const resolveExit = (sig, price) => {
  if (!sig || String(sig.status || "").toUpperCase() !== "OPEN" || !isNum(price)) {
    return {
      status: sig?.status,
      exitPrice: price,
      triggered: false
    };
  }

  if (sig.side === "LONG") {
    if (price <= sig.sl) {
      return { status: "SL", exitPrice: sig.sl, triggered: true };
    }

    if (price >= sig.tp) {
      return { status: "TP", exitPrice: sig.tp, triggered: true };
    }
  }

  if (sig.side === "SHORT") {
    if (price >= sig.sl) {
      return { status: "SL", exitPrice: sig.sl, triggered: true };
    }

    if (price <= sig.tp) {
      return { status: "TP", exitPrice: sig.tp, triggered: true };
    }
  }

  return {
    status: sig.status,
    exitPrice: price,
    triggered: false
  };
};

export function upsertSignal(sig, { emit = true } = {}) {
  return market.upsertSignal(sig, { emit });
}

export function patchSignal(key, patch, { emit = true } = {}) {
  const cur = market.getSignal(key);
  if (!cur) return null;

  const next = {
    ...cur,
    ...(patch && typeof patch === "object" ? patch : {}),
    key: cur.key,
    symbol: cur.symbol
  };

  return market.upsertSignal(next, { emit });
}

export function removeSignal(key, { emit = true } = {}) {
  return market.removeSignal(key, { emit });
}

export function listSignals(limit = 500) {
  return market.listSignals(limit);
}

export function getSignal(key) {
  return market.getSignal(key);
}

export function updateLive(sig, price, _qty, { emit = true } = {}) {
  if (!sig || !sig.key) return null;
  if (!isNum(price)) return sig;
  if (isClosedStatus(sig.status)) return sig;

  const position = resolvePosition(sig);
  if (!isNum(position.qty) || position.qty <= 0) return sig;

  const ts = now();
  const exit = resolveExit(sig, price);
  const valuationPrice = exit.triggered ? exit.exitPrice : price;

  const pnl = computePnL(sig, valuationPrice, position.qty);
  const history = Array.isArray(sig.history) ? [...sig.history] : [];

  history.push({
    t: ts,
    p: valuationPrice,
    pp: pnl.pnlPct,
    u: pnl.pnlUsdt
  });

  if (history.length > 240) {
    history.splice(0, history.length - 240);
  }

  const next = {
    ...sig,
    qty: position.qty,
    capitalUsd: position.capitalUsd,
    live: valuationPrice,
    lastLiveTs: ts,
    pnlUsdt: pnl.pnlUsdt,
    pnlPct: pnl.pnlPct,
    history,
    status: exit.status
  };

  if (exit.triggered) {
    next.closedAt = ts;
    next.exitPrice = valuationPrice;
  }

  return market.upsertSignal(next, { emit });
}

export default {
  upsertSignal,
  patchSignal,
  removeSignal,
  listSignals,
  getSignal,
  updateLive
};