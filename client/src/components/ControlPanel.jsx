import { useEffect, useMemo, useState, useCallback, memo } from "react";

const STORAGE_KEY = "signalpulse.controlpanel.v3";
const FIXED_POSITION_USD = 1000;

const DEFAULT_VISIBLE_CFG = {
  strategy: "EMA_ATR",
  universeSize: 40,
  atrLen: 14,
  atrFactor: 1.5,
  rrTarget: 2.0
};

const INTERNAL_RUNTIME_DEFAULTS = {
  scan: { batch: 8, throttleMs: 140, backfill: 180, symbolCooldownMs: 6500 },
  timeframe: { tick1mSec: 45, tick5mSec: 120 },
  indicators: { emaFast: 34, emaSlow: 144 },
  live: { pnlPollSec: 3 },
  price: { mode: "last" }
};

const toNum = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const sanitizeVisibleConfig = (incoming) => ({
  strategy:
    String(incoming?.strategy || DEFAULT_VISIBLE_CFG.strategy)
      .trim()
      .toUpperCase() || DEFAULT_VISIBLE_CFG.strategy,

  universeSize: toNum(incoming?.universeSize, DEFAULT_VISIBLE_CFG.universeSize),
  atrLen: toNum(incoming?.atrLen, DEFAULT_VISIBLE_CFG.atrLen),
  atrFactor: toNum(incoming?.atrFactor, DEFAULT_VISIBLE_CFG.atrFactor),
  rrTarget: toNum(incoming?.rrTarget, DEFAULT_VISIBLE_CFG.rrTarget)
});

const loadConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VISIBLE_CFG };
    return sanitizeVisibleConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_VISIBLE_CFG };
  }
};

const saveConfig = (cfg) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    return null;
  }
};

const toCanonicalPayload = (cfg) => ({
  strategy: cfg.strategy,
  universe: { size: cfg.universeSize },
  scan: { ...INTERNAL_RUNTIME_DEFAULTS.scan },
  timeframe: { ...INTERNAL_RUNTIME_DEFAULTS.timeframe },
  indicators: {
    ...INTERNAL_RUNTIME_DEFAULTS.indicators,
    atrLen: cfg.atrLen,
    atrFactor: cfg.atrFactor
  },
  risk: {
    rrTarget: cfg.rrTarget
  },
  live: { ...INTERNAL_RUNTIME_DEFAULTS.live },
  price: { ...INTERNAL_RUNTIME_DEFAULTS.price }
});

const ControlPanel = memo(function ControlPanel({
  onStart,
  onStop,
  onReset,
  disabledStart,
  disabledStop
}) {
  const [cfg, setCfg] = useState(() => loadConfig());

  useEffect(() => {
    saveConfig(cfg);
  }, [cfg]);

  const setValue = useCallback((key, value) => {
    setCfg((prev) =>
      sanitizeVisibleConfig({
        ...prev,
        [key]: value
      })
    );
  }, []);

  const resetLocalDefaults = useCallback(() => {
    setCfg({ ...DEFAULT_VISIBLE_CFG });
  }, []);

  const payload = useMemo(() => toCanonicalPayload(cfg), [cfg]);

  const handleStart = useCallback(() => {
    onStart?.(payload);
  }, [onStart, payload]);

  const handleStopReset = useCallback(async () => {
    await onStop?.();
    await onReset?.();
  }, [onStop, onReset]);

  return (
    <section className="card">
      <h1>Control Panel</h1>

      <label htmlFor="strategy">Strategy</label>
      <select
        id="strategy"
        value={cfg.strategy}
        onChange={(e) => setValue("strategy", e.target.value)}
      >
        <option value="EMA_ATR">EMA_ATR</option>
      </select>

      <label htmlFor="universeSize">Universe Size (Top Volume USDT-Perps)</label>
      <input
        id="universeSize"
        type="number"
        min="1"
        max="200"
        value={cfg.universeSize}
        onChange={(e) => setValue("universeSize", e.target.value)}
      />

      <div className="row">
        <div>
          <label htmlFor="atrLen">ATR length</label>
          <input
            id="atrLen"
            type="number"
            value={cfg.atrLen}
            onChange={(e) => setValue("atrLen", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="atrFactor">ATR factor (SL distance)</label>
          <input
            id="atrFactor"
            type="number"
            step="0.05"
            value={cfg.atrFactor}
            onChange={(e) => setValue("atrFactor", e.target.value)}
          />
        </div>
      </div>

      <div className="row">
        <div>
          <label htmlFor="rrTarget">RR target (TP)</label>
          <input
            id="rrTarget"
            type="number"
            step="0.1"
            value={cfg.rrTarget}
            onChange={(e) => setValue("rrTarget", e.target.value)}
          />
        </div>
        <div>
          <label>Position Size</label>
          <div className="readonly-field">
            {FIXED_POSITION_USD.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} USDT fixed
          </div>
        </div>
      </div>

      <div className="btns">
        <button
          className="primary"
          disabled={!!disabledStart}
          onClick={handleStart}
        >
          Start
        </button>

        <button
          className="ghost"
          disabled={!!disabledStop}
          onClick={handleStopReset}
        >
          Stop & Reset
        </button>

        <button
          className="ghost"
          onClick={resetLocalDefaults}
        >
          Reset Form
        </button>
      </div>
    </section>
  );
});

export default ControlPanel;