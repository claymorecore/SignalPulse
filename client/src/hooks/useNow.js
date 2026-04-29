import { useEffect, useState, useRef } from "react";

/**
 * Custom hook that returns the current timestamp, updated at a specified interval.
 *
 * @param {number} tickMs - update interval in milliseconds (minimum 250ms)
 * @returns {number} current timestamp in milliseconds
 */
export default function useNow(tickMs = 1000) {
  // State holding the current timestamp
  const [now, setNow] = useState(() => Date.now());

  // Ref to store latest tick interval (for possible future extensions)
  const savedTickMs = useRef(Math.max(250, Number(tickMs) || 1000));

  useEffect(() => {
    // Ensure tickMs is numeric and at least 250ms
    const intervalMs = Math.max(250, Number(tickMs) || 1000);
    savedTickMs.current = intervalMs;

    // Tick function updates timestamp
    const tick = () => setNow(Date.now());

    // Start interval
    const id = setInterval(tick, intervalMs);

    // Cleanup on unmount or tickMs change
    return () => clearInterval(id);
  }, [tickMs]); // Restart interval if tickMs changes

  return now;
}