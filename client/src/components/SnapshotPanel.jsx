import { memo } from "react";
import { fmt4, fmtPct, fmtUsdt, fmtAge } from "../lib/format.js";

const safeText = (value) => {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
};

const fmtNum = (value, digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "–";
  return n.toFixed(digits);
};

const KV = ({ label, value }) => (
  <div>
    <span>{label}</span>
    <b>{value}</b>
  </div>
);

const SnapshotPanel = memo(function SnapshotPanel({ signal, refNow }) {
  if (!signal) {
    return (
      <section className="panel">
        <h3>Snapshot</h3>
        <div className="sub">Select a signal to view details.</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <h3>Snapshot</h3>

      <div className="kv">
        <KV label="Symbol" value={safeText(signal.symbol)} />
        <KV label="TF" value={safeText(signal.tf).toUpperCase()} />

        <KV label="Setup" value={safeText(signal.setup)} />
        <KV label="Side" value={safeText(signal.side).toUpperCase()} />

        <KV label="Status" value={safeText(signal.status).toUpperCase()} />
        <KV label="Entry" value={fmt4(signal.entry)} />

        <KV label="SL" value={fmt4(signal.sl)} />
        <KV label="TP" value={fmt4(signal.tp)} />

        <KV label="RR" value={fmtNum(signal.rr, 2)} />
        <KV label="Qty" value={fmtNum(signal.qty, 2)} />

        <KV label="Capital" value={`${fmtNum(signal.capitalUsd, 2)} USDT`} />
        <KV label="Risk Dist" value={fmtNum(signal.riskDistance, 6)} />

        <KV label="Live" value={fmt4(signal.live)} />
        <KV label="PnL%" value={fmtPct(signal.pnlPct)} />

        <KV label="PnL(USDT)" value={fmtUsdt(signal.pnlUsdt)} />
        <KV label="Created" value={fmtAge(signal.createdAt, refNow)} />

        <KV label="Last Scan" value={fmtAge(signal.lastScanTs, refNow)} />
        <KV label="Last Live" value={fmtAge(signal.lastLiveTs, refNow)} />
      </div>
    </section>
  );
});

export default SnapshotPanel;