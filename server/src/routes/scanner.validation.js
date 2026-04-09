import strategies from "../scanner/strategies/index.js";

const isObj = (value) => !!value && typeof value === "object" && !Array.isArray(value);

const isFiniteNumber = (value) =>
  typeof value === "number"
    ? Number.isFinite(value)
    : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));

const ensureNumber = (errors, path, value, { min = -Infinity, max = Infinity, integer = false } = {}) => {
  if (!isFiniteNumber(value)) {
    errors.push({ path, message: "must be a finite number" });
    return;
  }

  const num = Number(value);
  if (integer && !Number.isInteger(num)) {
    errors.push({ path, message: "must be an integer" });
    return;
  }
  if (num < min || num > max) {
    errors.push({ path, message: `must be between ${min} and ${max}` });
  }
};

export const validateScannerStartPayload = (body) => {
  const errors = [];

  if (body == null) {
    return errors;
  }

  if (!isObj(body)) {
    return [{ path: "body", message: "must be an object" }];
  }

  if ("strategy" in body) {
    const strategy = String(body.strategy || "").trim().toUpperCase();
    if (!strategy) {
      errors.push({ path: "strategy", message: "must not be empty" });
    } else if (!strategies.listStrategies().includes(strategy)) {
      errors.push({ path: "strategy", message: `must be one of: ${strategies.listStrategies().join(", ")}` });
    }
  }

  if ("universe" in body) {
    if (!isObj(body.universe)) {
      errors.push({ path: "universe", message: "must be an object" });
    } else if ("size" in body.universe) {
      ensureNumber(errors, "universe.size", body.universe.size, { min: 1, max: 200, integer: true });
    }
  }

  if ("scan" in body) {
    if (!isObj(body.scan)) {
      errors.push({ path: "scan", message: "must be an object" });
    } else {
      if ("batch" in body.scan) ensureNumber(errors, "scan.batch", body.scan.batch, { min: 1, max: 80, integer: true });
      if ("throttleMs" in body.scan) ensureNumber(errors, "scan.throttleMs", body.scan.throttleMs, { min: 0, max: 5000, integer: true });
      if ("backfill" in body.scan) ensureNumber(errors, "scan.backfill", body.scan.backfill, { min: 80, max: 800, integer: true });
      if ("symbolCooldownMs" in body.scan) ensureNumber(errors, "scan.symbolCooldownMs", body.scan.symbolCooldownMs, { min: 200, max: 600000, integer: true });
    }
  }

  if ("timeframe" in body) {
    if (!isObj(body.timeframe)) {
      errors.push({ path: "timeframe", message: "must be an object" });
    } else {
      if ("tick1mSec" in body.timeframe) ensureNumber(errors, "timeframe.tick1mSec", body.timeframe.tick1mSec, { min: 10, max: 3600, integer: true });
      if ("tick5mSec" in body.timeframe) ensureNumber(errors, "timeframe.tick5mSec", body.timeframe.tick5mSec, { min: 30, max: 3600, integer: true });
      if ("frames" in body.timeframe) {
        if (!Array.isArray(body.timeframe.frames) || body.timeframe.frames.length === 0) {
          errors.push({ path: "timeframe.frames", message: "must be a non-empty array" });
        } else {
          const allowed = new Set(["1m", "5m"]);
          for (const [index, frame] of body.timeframe.frames.entries()) {
            if (!allowed.has(String(frame || "").trim())) {
              errors.push({ path: `timeframe.frames[${index}]`, message: "must be one of: 1m, 5m" });
            }
          }
        }
      }
    }
  }

  if ("indicators" in body) {
    if (!isObj(body.indicators)) {
      errors.push({ path: "indicators", message: "must be an object" });
    } else {
      if ("emaFast" in body.indicators) ensureNumber(errors, "indicators.emaFast", body.indicators.emaFast, { min: 2, max: 500, integer: true });
      if ("emaSlow" in body.indicators) ensureNumber(errors, "indicators.emaSlow", body.indicators.emaSlow, { min: 5, max: 600, integer: true });
      if ("atrLen" in body.indicators) ensureNumber(errors, "indicators.atrLen", body.indicators.atrLen, { min: 2, max: 200, integer: true });
      if ("atrFactor" in body.indicators) ensureNumber(errors, "indicators.atrFactor", body.indicators.atrFactor, { min: 0.05, max: 100 });
    }
  }

  if ("risk" in body) {
    if (!isObj(body.risk)) {
      errors.push({ path: "risk", message: "must be an object" });
    } else {
      if ("rrTarget" in body.risk) ensureNumber(errors, "risk.rrTarget", body.risk.rrTarget, { min: 0.1, max: 100 });
      if ("qty" in body.risk) ensureNumber(errors, "risk.qty", body.risk.qty, { min: 0.0001, max: 1_000_000 });
      if ("riskMult" in body.risk) ensureNumber(errors, "risk.riskMult", body.risk.riskMult, { min: 0.1, max: 1_000_000 });
    }
  }

  if ("live" in body) {
    if (!isObj(body.live)) {
      errors.push({ path: "live", message: "must be an object" });
    } else if ("pnlPollSec" in body.live) {
      ensureNumber(errors, "live.pnlPollSec", body.live.pnlPollSec, { min: 1, max: 60, integer: true });
    }
  }

  if ("price" in body) {
    if (!isObj(body.price)) {
      errors.push({ path: "price", message: "must be an object" });
    } else if ("mode" in body.price) {
      const mode = String(body.price.mode || "").trim();
      if (!["mark", "last"].includes(mode)) {
        errors.push({ path: "price.mode", message: "must be one of: mark, last" });
      }
    }
  }

  return errors;
};

export default {
  validateScannerStartPayload
};
