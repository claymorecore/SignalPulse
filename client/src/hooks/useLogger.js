import { useCallback, useState } from "react";

/**
 * Utility to cap an array to a maximum length
 */
const capArray = (arr, max) =>
  arr.length > max ? arr.slice(arr.length - max) : arr;

export default function useLogger(limit = 500) {
  const [rows, setRows] = useState([]);

  const push = useCallback(
    (level, msg, meta = null) => {
      const timestamp = Date.now();
      setRows((prev) => {
        return capArray([...prev, { t: timestamp, lvl: level, msg, meta }], limit);
      });
    },
    [limit]
  );

  return {
    rows,
    push
  };
}
