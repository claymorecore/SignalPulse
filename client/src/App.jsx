import { useCallback, useMemo } from "react";
import useNow from "./hooks/useNow.js";
import useLogger from "./hooks/useLogger.js";
import useSignalStore from "./hooks/useSignalStore.js";
import useSnapshotFeed from "./hooks/useSnapshotFeed.js";
import { apiPost } from "./lib/api.js";

import Badges from "./components/Badges.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import SignalsTable from "./components/SignalsTable.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import SnapshotPanel from "./components/SnapshotPanel.jsx";

import './App.css';

export default function App() {
  const tNow = useNow(1000);
  const log = useLogger(700);
  const { state, applySnapshot, select, clearSelect, selected } = useSignalStore();
  const scannerIsActive = useMemo(
    () => ["running", "started", "scanning"].includes(String(state.status).toLowerCase()),
    [state.status]
  );

  const onSnapshot = useCallback((snap) => { applySnapshot(snap); }, [applySnapshot]);

  const wsUrl = useMemo(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    if (import.meta.env.DEV) return `${proto}://localhost:3000/ws`;
    return `${proto}://${window.location.host}/ws`;
  }, []);

  useSnapshotFeed({ onSnapshot, pollMs: 1200, wsUrl });

  const onStart = useCallback(async (cfg) => {
    if (scannerIsActive) return;

    try {
      log.push("INFO", "scanner start", cfg);
      const r = await apiPost("/api/scanner/start", cfg);
      log.push("OK", "scanner started", r);
    } catch (e) {
      log.push("ERR", "scanner start failed", { msg: e?.message || String(e), status: e?.status || null });
    }
  }, [log, scannerIsActive]);

  const onReset = useCallback(async () => {
    try {
      log.push("WARN", "scanner reset", {});
      const r = await apiPost("/api/scanner/reset", {});
      log.push("OK", "scanner reset", r);
      clearSelect();
    } catch (e) {
      log.push("ERR", "scanner reset failed", { msg: e?.message || String(e), status: e?.status || null });
    }
  }, [log, clearSelect]);

  const disabledStart = useMemo(() => scannerIsActive, [scannerIsActive]);
  const disabledStop = useMemo(() => !scannerIsActive, [scannerIsActive]);

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <div className="logo">SP</div>
          <div>
            <div className="app-title">SignalPulse</div>
            <div className="sub">
              Entry, SL/TP, RR, live PnL and full signal history for smarter trading.
            </div>
          </div>
        </div>

        <Badges
          status={state.status}
          session={state.session}
          universeCount={state.universeCount}
          signalsCount={state.signals.length}
        />
      </header>

      <div className="grid">
        <ControlPanel
          onStart={onStart}
          onReset={onReset}
          onExportLogs={log.exportJsonl}
          disabledStart={disabledStart}
          disabledStop={disabledStop}
        />

        <section className="card">
          <h2>Signals</h2>
          <SignalsTable signals={state.signals} selectedKey={state.selectedKey} onSelect={select} refNow={tNow} />

          <div className="split">
            <HistoryPanel signal={selected} refNow={tNow} />
            <SnapshotPanel signal={selected} refNow={tNow} />
          </div>

          <div className="logWrap">
            <div className="logTop">
              <span>Logs</span>
              <span className="mini">
                req:{log.summary.req} ok:{log.summary.ok} 429:{log.summary.s429} 5xx:{log.summary.s5xx} err:{log.summary.err} | p50:{log.summary.p50 ?? "–"} p95:{log.summary.p95 ?? "–"}
              </span>
            </div>
            <div className="log">
              {log.rows.slice().reverse().map((r,i) => (
                <div key={i} className="mini mono" style={{ opacity: 0.92 }}>
                  [{new Date(r.t).toLocaleTimeString()}] {r.lvl} {r.msg} {r.meta ? JSON.stringify(r.meta) : ""}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <footer>
        <span>© SignalPulse — no financial advice</span>
        <span>{import.meta.env.DEV ? "v0.0.1" : "alpha"}</span>
      </footer>
    </div>
  );
}
