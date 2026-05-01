import { useCallback, useState } from "react";

const MAX_MERGE_WINDOW_MS = 4000;

// Normalize log level
const normalizeLevel = (lvl) => {
  const l = String(lvl || "").toUpperCase();
  if (["OK", "SUCCESS"].includes(l)) return "OK";
  if (["ERR", "ERROR"].includes(l)) return "ERR";
  if (["WARN", "WARNING"].includes(l)) return "WARN";
  return "INFO";
};

const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (a[k] !== b[k]) return false;
  }
  return true;
};

const capArray = (arr, max) =>
  arr.length > max ? arr.slice(arr.length - max) : arr;

export default function useLogger(limit = 500) {
  const [rows, setRows] = useState([]);

  const push = useCallback((level, msg, meta = null) => {
    const timestamp = Date.now();
    const lvl = normalizeLevel(level);

    setRows((prev) => {
      const last = prev[prev.length - 1];

      // 🔥 Merge similar logs (same msg + meta within short window)
      if (
        last &&
        last.msg === msg &&
        last.lvl === lvl &&
        shallowEqual(last.meta, meta) &&
        timestamp - last.t < MAX_MERGE_WINDOW_MS
      ) {
        const updated = {
          ...last,
          t: timestamp,
          count: (last.count || 1) + 1
        };

        return [...prev.slice(0, -1), updated];
      }

      const next = [
        ...prev,
        {
          t: timestamp,
          lvl,
          msg,
          meta,
          count: 1
        }
      ];

      return capArray(next, limit);
    });
  }, [limit]);

  return {
    rows,
    push
  };
}