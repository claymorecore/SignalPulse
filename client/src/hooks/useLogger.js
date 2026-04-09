import { useCallback, useMemo, useState } from "react";

/**
 * Utility to cap an array to a maximum length
 */
const capArray = (arr, max) =>
  arr.length > max ? arr.slice(arr.length - max) : arr;

/**
 * Custom hook for logging signals, metrics, and exporting logs
 *
 * @param {number} limit - maximum number of log entries to keep
 * @param {number} latencyCap - maximum number of latency samples to store
 * @returns {object} API for logging, metrics, summary, and export
 */
export default function useLogger(limit = 500, latencyCap = 400) {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    req: 0,
    ok: 0,
    s429: 0,
    s5xx: 0,
    err: 0,
    lat: []
  });

  /**
   * Push a new log entry
   */
  const push = useCallback(
    (level, msg, meta = null) => {
      const timestamp = Date.now();
      setRows((prev) => {
        const next = capArray([...prev, { t: timestamp, lvl: level, msg, meta }], limit);
        // Avoid unnecessary state update
        return next === prev ? prev : next;
      });
    },
    [limit]
  );

  /**
   * Record an HTTP / signal metric
   */
  const metric = useCallback(
    (status, ms) => {
      setStats((prev) => {
        const next = {
          ...prev,
          req: prev.req + 1,
          lat: Number.isFinite(ms)
            ? capArray([...prev.lat, ms], latencyCap)
            : prev.lat
        };

        if (status >= 200 && status < 300) next.ok += 1;
        else if (status === 429) next.s429 += 1;
        else if (status >= 500 && status < 600) next.s5xx += 1;
        else next.err += 1;

        return next;
      });
    },
    [latencyCap]
  );

  /**
   * Compute summary of metrics, including P50 / P95 latencies
   */
  const summary = useMemo(() => {
    const lat = [...stats.lat].sort((a, b) => a - b);

    const percentile = (q) =>
      lat.length
        ? lat[Math.min(lat.length - 1, Math.floor((q / 100) * lat.length))]
        : null;

    return {
      req: stats.req,
      ok: stats.ok,
      s429: stats.s429,
      s5xx: stats.s5xx,
      err: stats.err,
      p50: percentile(50),
      p95: percentile(95)
    };
  }, [stats]);

  /**
   * Export logs as JSONL file
   */
  const exportJsonl = useCallback(
    (filename) => {
      if (!rows.length) return;

      const blob = new Blob([rows.map((x) => JSON.stringify(x)).join("\n") + "\n"], {
        type: "application/x-ndjson"
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `signalpulse_logs_${Date.now()}.jsonl`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
    [rows]
  );

  return {
    rows,
    push,
    metric,
    summary,
    exportJsonl
  };
}
