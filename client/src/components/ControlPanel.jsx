import { useEffect, useMemo, useState, useCallback, memo } from "react";

const STORAGE_KEY = "signalpulse.controlpanel.v2";

const DEFAULT_CFG = {
  strategy: { name: "EMA_ATR" },
  universe: { size: 40 },
  scan: { batch: 8, throttleMs: 140, backfill: 180, symbolCooldownMs: 6500 },
  timeframe: { tick1mSec: 45, tick5mSec: 120 },
  indicators: { emaFast: 34, emaSlow: 144, atrLen: 14, atrFactor: 1.5 },
  risk: { rrTarget: 2.0, qty: 1, riskMult: 3.0 },
  live: { pnlPollSec: 3 },
  price: { mode: "last" }
};

// Merge partial config into defaults safely
const mergeConfig = (base, incoming) =>
  Object.keys(base).reduce((acc, key) => {
    acc[key] = { ...base[key], ...(incoming?.[key] || {}) };
    return acc;
  }, {});

// Load config from localStorage
const loadConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CFG;
    const parsed = JSON.parse(raw);
    return mergeConfig(DEFAULT_CFG, parsed);
  } catch {
    return DEFAULT_CFG;
  }
};

// Save config to localStorage
const saveConfig = (cfg) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (error) {
    console.error("Error saving config:", error);
  }
};

// Convert config into canonical payload for API/start
const toCanonicalPayload = (cfg) => ({
  strategy: String(cfg.strategy.name || "EMA_ATR").trim().toUpperCase(),
  universe: { size: Number(cfg.universe.size) },
  scan: {
    batch: Number(cfg.scan.batch),
    throttleMs: Number(cfg.scan.throttleMs),
    backfill: Number(cfg.scan.backfill),
    symbolCooldownMs: Number(cfg.scan.symbolCooldownMs)
  },
  timeframe: {
    tick1mSec: Number(cfg.timeframe.tick1mSec),
    tick5mSec: Number(cfg.timeframe.tick5mSec)
  },
  indicators: {
    emaFast: Number(cfg.indicators.emaFast),
    emaSlow: Number(cfg.indicators.emaSlow),
    atrLen: Number(cfg.indicators.atrLen),
    atrFactor: Number(cfg.indicators.atrFactor)
  },
  risk: {
    rrTarget: Number(cfg.risk.rrTarget),
    qty: Number(cfg.risk.qty),
    riskMult: Number(cfg.risk.riskMult)
  },
  live: { pnlPollSec: Number(cfg.live.pnlPollSec) },
  price: { mode: "last" }
});

const ControlPanel = memo(function ControlPanel({
  onStart,
  onReset,
  disabledStart,
  disabledStop
}) {
  const [cfg, setCfg] = useState(() => loadConfig());

  // Persist config on change
  useEffect(() => saveConfig(cfg), [cfg]);

  // Update a single value in config safely
  const setValue = useCallback((section, key, value) => {
    setCfg(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  }, []);

  // Reset to defaults
  const resetLocalDefaults = useCallback(() => setCfg(DEFAULT_CFG), []);

  // Canonical payload memoized
  const payload = useMemo(() => toCanonicalPayload(cfg), [cfg]);

  // Handle start
  const handleStart = useCallback(() => onStart?.(payload), [onStart, payload]);

  // Handle stop & reset with error logging
  const handleStopReset = useCallback(async () => {
    try {
      if (onReset) await onReset();
    } catch (error) {
      console.error("Error during stop/reset:", error);
    }
  }, [onReset]);

  return (
    <section className="card">
      <h1>Control Panel</h1>

      <label htmlFor="strategy">Strategy</label>
      <select
        id="strategy"
        value={cfg.strategy.name}
        onChange={e => setValue("strategy", "name", e.target.value)}
      >
        <option value="EMA_ATR">EMA_ATR</option>
      </select>

      <label htmlFor="universeSize">Universe Size (Top Volume USDT-Perps)</label>
      <input
        id="universeSize"
        type="number"
        min="1"
        max="200"
        value={cfg.universe.size}
        onChange={e => setValue("universe", "size", e.target.value)}
      />

      <div className="row">
        <div>
          <label htmlFor="atrLen">ATR length</label>
          <input
            id="atrLen"
            type="number"
            value={cfg.indicators.atrLen}
            onChange={e => setValue("indicators", "atrLen", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="atrFactor">ATR factor (SL distance)</label>
          <input
            id="atrFactor"
            type="number"
            step="0.05"
            value={cfg.indicators.atrFactor}
            onChange={e => setValue("indicators", "atrFactor", e.target.value)}
          />
        </div>
      </div>

      {/* Risk */}
      <div className="row">
        <div>
          <label htmlFor="rrTarget">RR target (TP)</label>
          <input
            id="rrTarget"
            type="number"
            step="0.1"
            value={cfg.risk.rrTarget}
            onChange={e => setValue("risk", "rrTarget", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="qty">Qty (PnL calc)</label>
          <input
            id="qty"
            type="number"
            step="0.01"
            value={cfg.risk.qty}
            onChange={e => setValue("risk", "qty", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="riskMult">Risk Mult (Fast PnL)</label>
          <input
            id="riskMult"
            type="number"
            step="0.1"
            min="0.1"
            value={cfg.risk.riskMult}
            onChange={e => setValue("risk", "riskMult", e.target.value)}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="btns">
        <button className="primary" disabled={!!disabledStart} onClick={handleStart}>
          Start
        </button>
        <button className="ghost" disabled={!!disabledStop} onClick={handleStopReset}>
          Stop & Reset
        </button>
        <button className="ghost" onClick={resetLocalDefaults}>
          Reset Form
        </button>
      </div>
    </section>
  );
});

export default ControlPanel;
