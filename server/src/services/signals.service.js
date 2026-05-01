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

const getRiskDistance = (sig) => {
  const explicit = Number(sig?.riskDistance);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const entry = Number(sig?.entry);
  const sl = Number(sig?.sl);

  if (Number.isFinite(entry) && Number.isFinite(sl)) {
    const dist = Math.abs(entry - sl);
    if (dist > 0) return dist;
  }

  return NaN;
};

const getFavorableMove = (sig, price) => {
  if (!sig || !isNum(sig.entry) || !isNum(price) || !isValidSide(sig.side)) {
    return NaN;
  }

  return sig.side === "LONG"
    ? price - sig.entry
    : sig.entry - price;
};

const getRMultiple = (sig, price) => {
  const riskDistance = getRiskDistance(sig);
  const favorableMove = getFavorableMove(sig, price);

  if (!isNum(riskDistance) || riskDistance <= 0 || !isNum(favorableMove)) {
    return NaN;
  }

  return favorableMove / riskDistance;
};

const buildProtection = (sig, price) => {
  const riskDistance = getRiskDistance(sig);
  const rNow = getRMultiple(sig, price);

  const prevPeakR = Number.isFinite(+sig?.peakR) ? +sig.peakR : 0;
  const peakR = Number.isFinite(rNow) ? Math.max(prevPeakR, rNow) : prevPeakR;

  const breakEvenTriggerR = Number.isFinite(+sig?.breakEvenTriggerR)
    ? +sig.breakEvenTriggerR
    : 0.5;

  const breakEvenLockR = Number.isFinite(+sig?.breakEvenLockR)
    ? +sig.breakEvenLockR
    : 0.05;

  const profitLockTriggerR = Number.isFinite(+sig?.profitLockTriggerR)
    ? +sig.profitLockTriggerR
    : 1.0;

  const profitLockR = Number.isFinite(+sig?.profitLockR)
    ? +sig.profitLockR
    : 0.35;

  if (!isNum(riskDistance) || riskDistance <= 0 || !isValidSide(sig?.side)) {
    return {
      peakR,
      protectionStop: NaN,
      protectionMode: null
    };
  }

  let lockR = null;
  let protectionMode = null;

  if (peakR >= profitLockTriggerR) {
    lockR = profitLockR;
    protectionMode = "PROFIT_LOCK";
  } else if (peakR >= breakEvenTriggerR) {
    lockR = breakEvenLockR;
    protectionMode = "BREAK_EVEN";
  }

  if (!Number.isFinite(lockR)) {
    return {
      peakR,
      protectionStop: NaN,
      protectionMode: null
    };
  }

  const protectionStop = sig.side === "LONG"
    ? sig.entry + lockR * riskDistance
    : sig.entry - lockR * riskDistance;

  return {
    peakR,
    protectionStop,
    protectionMode
  };
};

const resolveExit = (sig, price) => {
  if (!sig || String(sig.status || "").toUpperCase() !== "OPEN" || !isNum(price)) {
    return {
      status: sig?.status,
      exitPrice: price,
      triggered: false,
      exitReason: null,
      protection: null
    };
  }

  const protection = buildProtection(sig, price);
  const protectionStop = protection.protectionStop;

  if (sig.side === "LONG") {
    if (price >= sig.tp) {
      return {
        status: "TP",
        exitPrice: sig.tp,
        triggered: true,
        exitReason: "TAKE_PROFIT",
        protection
      };
    }

    if (isNum(protectionStop) && price <= protectionStop && protectionStop > sig.sl) {
      return {
        status: "CLOSED",
        exitPrice: protectionStop,
        triggered: true,
        exitReason: protection.protectionMode || "PROFIT_PROTECTION",
        protection
      };
    }

    if (price <= sig.sl) {
      return {
        status: "SL",
        exitPrice: sig.sl,
        triggered: true,
        exitReason: "STOP_LOSS",
        protection
      };
    }
  }

  if (sig.side === "SHORT") {
    if (price <= sig.tp) {
      return {
        status: "TP",
        exitPrice: sig.tp,
        triggered: true,
        exitReason: "TAKE_PROFIT",
        protection
      };
    }

    if (isNum(protectionStop) && price >= protectionStop && protectionStop < sig.sl) {
      return {
        status: "CLOSED",
        exitPrice: protectionStop,
        triggered: true,
        exitReason: protection.protectionMode || "PROFIT_PROTECTION",
        protection
      };
    }

    if (price >= sig.sl) {
      return {
        status: "SL",
        exitPrice: sig.sl,
        triggered: true,
        exitReason: "STOP_LOSS",
        protection
      };
    }
  }

  return {
    status: sig.status,
    exitPrice: price,
    triggered: false,
    exitReason: null,
    protection
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

  const protection = exit.protection || buildProtection(sig, price);
  const peakPnlUsdt = Math.max(
    Number.isFinite(+sig.peakPnlUsdt) ? +sig.peakPnlUsdt : 0,
    Number.isFinite(pnl.pnlUsdt) ? pnl.pnlUsdt : 0
  );

  history.push({
    t: ts,
    p: valuationPrice,
    pp: pnl.pnlPct,
    u: pnl.pnlUsdt,
    r: getRMultiple(sig, valuationPrice),
    protectionStop: isNum(protection.protectionStop) ? protection.protectionStop : null,
    protectionMode: protection.protectionMode || null,
    exitReason: exit.triggered ? exit.exitReason : null
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
    status: exit.status,
    peakR: protection.peakR,
    peakPnlUsdt,
    protectionStop: isNum(protection.protectionStop) ? protection.protectionStop : NaN,
    protectionMode: protection.protectionMode || null
  };

  if (exit.triggered) {
    next.closedAt = ts;
    next.exitPrice = valuationPrice;
    next.exitReason = exit.exitReason || (
      exit.status === "TP"
        ? "TAKE_PROFIT"
        : exit.status === "SL"
          ? "STOP_LOSS"
          : "PROFIT_PROTECTION"
    );
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