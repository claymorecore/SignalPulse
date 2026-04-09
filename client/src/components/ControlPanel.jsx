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
  price: { mode: "mark" }
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
  price: { mode: String(cfg.price.mode || "mark") }
});

const ControlPanel = memo(function ControlPanel({
  onStart,
  onReset,
  onExportLogs,
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

      {/* Scan & Throttle */}
      <div className="row">
        <div>
          <label htmlFor="scanBatch">Scan Batch (symbols/tick)</label>
          <input
            id="scanBatch"
            type="number"
            min="1"
            max="80"
            value={cfg.scan.batch}
            onChange={e => setValue("scan", "batch", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="throttleMs">Throttle per symbol (ms)</label>
          <input
            id="throttleMs"
            type="number"
            min="0"
            value={cfg.scan.throttleMs}
            onChange={e => setValue("scan", "throttleMs", e.target.value)}
          />
        </div>
      </div>

      {/* Timeframes */}
      <div className="row">
        <div>
          <label htmlFor="tick1m">TF 1m tick (sec)</label>
          <input
            id="tick1m"
            type="number"
            min="10"
            value={cfg.timeframe.tick1mSec}
            onChange={e => setValue("timeframe", "tick1mSec", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="tick5m">TF 5m tick (sec)</label>
          <input
            id="tick5m"
            type="number"
            min="30"
            value={cfg.timeframe.tick5mSec}
            onChange={e => setValue("timeframe", "tick5mSec", e.target.value)}
          />
        </div>
      </div>

      {/* Indicators */}
      <div className="row">
        <div>
          <label htmlFor="emaFast">EMA fast</label>
          <input
            id="emaFast"
            type="number"
            value={cfg.indicators.emaFast}
            onChange={e => setValue("indicators", "emaFast", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="emaSlow">EMA slow</label>
          <input
            id="emaSlow"
            type="number"
            value={cfg.indicators.emaSlow}
            onChange={e => setValue("indicators", "emaSlow", e.target.value)}
          />
        </div>
      </div>

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

      {/* Live & Price */}
      <div className="row">
        <div>
          <label htmlFor="pnlPoll">Live PnL poll (sec)</label>
          <input
            id="pnlPoll"
            type="number"
            min="1"
            value={cfg.live.pnlPollSec}
            onChange={e => setValue("live", "pnlPollSec", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="usePrice">Use Price</label>
          <select
            id="usePrice"
            value={cfg.price.mode}
            onChange={e => setValue("price", "mode", e.target.value)}
          >
            <option value="mark">mark (premiumIndex bulk)</option>
            <option value="last">last (ticker/price bulk)</option>
          </select>
        </div>
      </div>

      {/* Scan Backfill & Cooldown */}
      <div className="row">
        <div>
          <label htmlFor="backfill">Klines backfill</label>
          <input
            id="backfill"
            type="number"
            min="80"
            max="800"
            value={cfg.scan.backfill}
            onChange={e => setValue("scan", "backfill", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cooldown">Per-symbol TF cooldown (ms)</label>
          <input
            id="cooldown"
            type="number"
            min="200"
            value={cfg.scan.symbolCooldownMs}
            onChange={e => setValue("scan", "symbolCooldownMs", e.target.value)}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="btns">
        <button className="primary" onClick={handleStart}>
          Start
        </button>
        <button className="ghost" disabled={!!disabledStop} onClick={handleStopReset}>
          Stop & Reset
        </button>
        <button className="ghost" onClick={resetLocalDefaults}>
          Reset Form
        </button>
        <button className="ghost" onClick={() => onExportLogs?.()}>
          Export Logs
        </button>
      </div>
    </section>
  );
});

export default ControlPanel;
