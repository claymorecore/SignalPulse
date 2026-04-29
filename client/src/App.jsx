import { useCallback, useEffect, useMemo, useRef } from "react";
import useNow from "./hooks/useNow.js";
import useLogger from "./hooks/useLogger.js";
import useSignalStore from "./hooks/useSignalStore.js";
import useSnapshotFeed from "./hooks/useSnapshotFeed.js";
import { apiPost } from "./lib/api.js";
import { getActivityHelperText, translateLogRows } from "./lib/activityFeed.js";

import Badges from "./components/Badges.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import PerformancePanel from "./components/PerformancePanel.jsx";
import EquityPanel from "./components/EquityPanel.jsx";
import SignalsTable from "./components/SignalsTable.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import SnapshotPanel from "./components/SnapshotPanel.jsx";

export default function App() {
  const tNow = useNow(1000);
  const log = useLogger(700);
  const { state, applySnapshot, select, clearSelect, selected } = useSignalStore();

  const prevStateRef = useRef({
    status: state.status,
    signals: state.signals
  });

  const scannerIsActive = useMemo(
    () => ["running", "started", "scanning"].includes(String(state.status).toLowerCase()),
    [state.status]
  );

  const activityRows = useMemo(
    () => translateLogRows(log.rows),
    [log.rows]
  );

  const activityHelperText = useMemo(
    () =>
      getActivityHelperText({
        status: state.status,
        session: state.session,
        activityRows,
        now: tNow
      }),
    [state.status, state.session, activityRows, tNow]
  );

  const onSnapshot = useCallback((snap) => {
    applySnapshot(snap);
  }, [applySnapshot]);

  const wsUrl = useMemo(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";

    if (import.meta.env.DEV) {
      return `${proto}://localhost:3000/ws`;
    }

    return `${proto}://${window.location.host}/ws`;
  }, []);

  useSnapshotFeed({
    onSnapshot,
    pollMs: 1200,
    wsUrl
  });

  useEffect(() => {
    const previous = prevStateRef.current;
    const prevStatus = String(previous.status || "").toLowerCase();
    const nextStatus = String(state.status || "").toLowerCase();

    if (prevStatus !== nextStatus) {
      if (
        ["running", "started", "scanning"].includes(prevStatus) &&
        ["idle", "stopped"].includes(nextStatus)
      ) {
        log.push("INFO", "scanner stopped", { status: state.status });
      }
    }

    const prevSignals = new Map(
      (previous.signals || []).map((signal) => [signal.key, signal])
    );

    const nextSignals = new Map(
      (state.signals || []).map((signal) => [signal.key, signal])
    );

    nextSignals.forEach((signal, key) => {
      const previousSignal = prevSignals.get(key);

      if (!previousSignal) {
        log.push("INFO", "signal generated", {
          symbol: signal.symbol,
          side: signal.side
        });
        return;
      }

      if (previousSignal.status !== signal.status) {
        const nextSignalStatus = String(signal.status || "").toUpperCase();

        if (nextSignalStatus === "TP") {
          log.push("INFO", "target reached", {
            symbol: signal.symbol,
            side: signal.side
          });
        } else if (nextSignalStatus === "SL") {
          log.push("INFO", "stop loss triggered", {
            symbol: signal.symbol,
            side: signal.side
          });
        } else if (nextSignalStatus !== "OPEN") {
          log.push("INFO", "signal closed", {
            symbol: signal.symbol,
            side: signal.side,
            status: signal.status
          });
        }
      }
    });

    prevStateRef.current = {
      status: state.status,
      signals: state.signals
    };
  }, [state.status, state.signals, log]);

  const onStart = useCallback(async (cfg) => {
    if (scannerIsActive) return;

    try {
      log.push("INFO", "scanner start requested");
      const result = await apiPost("/api/scanner/start", cfg);
      log.push("OK", "scanner started", result);
    } catch (e) {
      log.push("ERR", "scanner start failed", {
        msg: e?.message || String(e),
        status: e?.status || null
      });
    }
  }, [log, scannerIsActive]);

  const onStop = useCallback(async () => {
    if (!scannerIsActive) return;

    try {
      const result = await apiPost("/api/scanner/stop", {});
      log.push("OK", "scanner stopped", result);
      clearSelect();
    } catch (e) {
      log.push("ERR", "scanner stop failed", {
        msg: e?.message || String(e),
        status: e?.status || null
      });
    }
  }, [log, scannerIsActive, clearSelect]);

  const onReset = useCallback(async () => {
    try {
      const result = await apiPost("/api/scanner/reset", {});
      log.push("OK", "scanner reset", result);
      clearSelect();
    } catch (e) {
      log.push("ERR", "scanner reset failed", {
        msg: e?.message || String(e),
        status: e?.status || null
      });
    }
  }, [log, clearSelect]);

  const disabledStart = scannerIsActive;
  const disabledStop = !scannerIsActive;

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
        {/* LEFT COLUMN */}
        <div>
          <ControlPanel
            onStart={onStart}
            onStop={onStop}
            onReset={onReset}
            disabledStart={disabledStart}
            disabledStop={disabledStop}
          />

          <PerformancePanel signals={state.signals} />

          {/* 👇 NEU: Equity Curve */}
          <EquityPanel signals={state.signals} />
        </div>

        {/* RIGHT COLUMN */}
        <section className="card">
          <h2>Signals</h2>

          <SignalsTable
            signals={state.signals}
            selectedKey={state.selectedKey}
            onSelect={select}
            refNow={tNow}
          />

          <div className="split">
            <HistoryPanel signal={selected} refNow={tNow} />
            <SnapshotPanel signal={selected} refNow={tNow} />
          </div>

          <div className="logWrap">
            <div className="logTop">
              <span>Logs</span>
              <span className="mini">{activityHelperText}</span>
            </div>

            <div className="log">
              {activityRows.slice().reverse().map((row, i) => {
                const key = `${row.t}-${row.title}-${i}`;

                return (
                  <div key={key} className="mini mono" style={{ opacity: 0.92 }}>
                    [{new Date(row.t).toLocaleTimeString()}] {row.title}
                    {row.detail ? (
                      <>
                        <br />
                        <span>{row.detail}</span>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <footer>
        <span>© SignalPulse - no financial advice</span>
        <span>{import.meta.env.DEV ? "v0.0.1" : "alpha"}</span>
      </footer>
    </div>
  );
}