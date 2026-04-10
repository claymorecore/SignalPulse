import { useEffect, useMemo, useState, useCallback, memo } from "react";

const STORAGE_KEY = "signalpulse.controlpanel.v2";

const DEFAULT_VISIBLE_CFG = {
  strategy: "EMA_ATR",
  universeSize: 40,
  atrLen: 14,
  atrFactor: 1.5,
  rrTarget: 2.0,
  qty: 1,
  riskMult: 3.0
};

const INTERNAL_RUNTIME_DEFAULTS = {
  scan: { batch: 8, throttleMs: 140, backfill: 180, symbolCooldownMs: 6500 },
  timeframe: { tick1mSec: 45, tick5mSec: 120 },
  indicators: { emaFast: 34, emaSlow: 144 },
  live: { pnlPollSec: 3 },
  price: { mode: "last" }
};

const sanitizeVisibleConfig = (incoming) => ({
  strategy: String(incoming?.strategy || DEFAULT_VISIBLE_CFG.strategy).trim().toUpperCase() || DEFAULT_VISIBLE_CFG.strategy,
  universeSize: incoming?.universeSize ?? DEFAULT_VISIBLE_CFG.universeSize,
  atrLen: incoming?.atrLen ?? DEFAULT_VISIBLE_CFG.atrLen,
  atrFactor: incoming?.atrFactor ?? DEFAULT_VISIBLE_CFG.atrFactor,
  rrTarget: incoming?.rrTarget ?? DEFAULT_VISIBLE_CFG.rrTarget,
  qty: incoming?.qty ?? DEFAULT_VISIBLE_CFG.qty,
  riskMult: incoming?.riskMult ?? DEFAULT_VISIBLE_CFG.riskMult
});

const loadConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_CFG;
    return sanitizeVisibleConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_VISIBLE_CFG;
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
  universe: { size: Number(cfg.universeSize) },
  scan: { ...INTERNAL_RUNTIME_DEFAULTS.scan },
  timeframe: { ...INTERNAL_RUNTIME_DEFAULTS.timeframe },
  indicators: {
    ...INTERNAL_RUNTIME_DEFAULTS.indicators,
    atrLen: Number(cfg.atrLen),
    atrFactor: Number(cfg.atrFactor)
  },
  risk: {
    rrTarget: Number(cfg.rrTarget),
    qty: Number(cfg.qty),
    riskMult: Number(cfg.riskMult)
  },
  live: { ...INTERNAL_RUNTIME_DEFAULTS.live },
  price: { ...INTERNAL_RUNTIME_DEFAULTS.price }
});

const ControlPanel = memo(function ControlPanel({
  onStart,
  onReset,
  disabledStart,
  disabledStop
}) {
  const [cfg, setCfg] = useState(() => loadConfig());

  useEffect(() => saveConfig(cfg), [cfg]);

  const setValue = useCallback((key, value) => {
    setCfg((prev) => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const resetLocalDefaults = useCallback(() => setCfg(DEFAULT_VISIBLE_CFG), []);

  const payload = useMemo(() => toCanonicalPayload(cfg), [cfg]);

  const handleStart = useCallback(() => onStart?.(payload), [onStart, payload]);

  const handleStopReset = useCallback(async () => {
    await onReset?.();
  }, [onReset]);

  return (
    <section className="card">
      <h1>Control Panel</h1>

      <label htmlFor="strategy">Strategy</label>
      <select
        id="strategy"
        value={cfg.strategy}
        onChange={e => setValue("strategy", e.target.value)}
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
        onChange={e => setValue("universeSize", e.target.value)}
      />

      <div className="row">
        <div>
          <label htmlFor="atrLen">ATR length</label>
          <input
            id="atrLen"
            type="number"
            value={cfg.atrLen}
            onChange={e => setValue("atrLen", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="atrFactor">ATR factor (SL distance)</label>
          <input
            id="atrFactor"
            type="number"
            step="0.05"
            value={cfg.atrFactor}
            onChange={e => setValue("atrFactor", e.target.value)}
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
            value={cfg.rrTarget}
            onChange={e => setValue("rrTarget", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="qty">Qty (PnL calc)</label>
          <input
            id="qty"
            type="number"
            step="0.01"
            value={cfg.qty}
            onChange={e => setValue("qty", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="riskMult">Risk Mult (Fast PnL)</label>
          <input
            id="riskMult"
            type="number"
            step="0.1"
            min="0.1"
            value={cfg.riskMult}
            onChange={e => setValue("riskMult", e.target.value)}
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
