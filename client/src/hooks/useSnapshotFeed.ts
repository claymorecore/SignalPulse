import { useEffect, useRef } from "react";
import { apiGet } from "../lib/api";

/**
 * Keep the snapshot store updated via WebSocket with polling fallback.
 *
 * @param {Object} options
 * @param {function} options.onSnapshot - callback invoked with new snapshots
 * @param {number} options.pollMs - polling interval (default 1200ms)
 * @param {string|null} options.wsUrl - WebSocket URL (optional)
 */
export default function useSnapshotFeed({ onSnapshot, pollMs = 1200, wsUrl = null }) {
  const aliveRef = useRef(false);
  const wsRef = useRef(null);
  const pollTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const seqRef = useRef(0);
  const connectingRef = useRef(false);
  const attemptRef = useRef(0);
  const abortControllerRef = useRef(null);
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    seqRef.current += 1;
    const mySeq = seqRef.current;

    const recordSnapshot = (snap) => {
      onSnapshot?.(snap);
    };

    const clearPoll = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const stopWS = () => {
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      }
      wsRef.current = null;
      connectingRef.current = false;
    };

    const pollOnce = async () => {
      if (!aliveRef.current || seqRef.current !== mySeq || pollInFlightRef.current) return;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      pollInFlightRef.current = true;
      try {
        const snap = await apiGet("/api/market/state", { signal: abortControllerRef.current.signal });
        if (!aliveRef.current || seqRef.current !== mySeq) return;
        recordSnapshot(snap);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("pollOnce failed:", err);
        }
      } finally {
        pollInFlightRef.current = false;
      }
    };

    const startPoll = () => {
      if (!aliveRef.current || seqRef.current !== mySeq || pollTimerRef.current) return;
      pollOnce();
      pollTimerRef.current = setInterval(pollOnce, Math.max(500, Number(pollMs) || 1200));
    };

    const scheduleReconnect = () => {
      if (!aliveRef.current || seqRef.current !== mySeq) return;
      clearReconnect();

      const attempt = Math.min(8, attemptRef.current || 0);
      const base = 1000 * Math.pow(1.6, attempt);
      const jitter = Math.floor(base * 0.2 * Math.random());
      const wait = Math.min(10000, Math.floor(base + jitter));

      reconnectTimerRef.current = setTimeout(() => startWS(), wait);
    };

    const startWS = () => {
      if (!aliveRef.current || seqRef.current !== mySeq) return;
      if (!wsUrl) { startPoll(); return; }
      if (connectingRef.current) return;

      const existing = wsRef.current;
      if (existing && (existing.readyState === 0 || existing.readyState === 1)) return;

      connectingRef.current = true;

      let ws;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        connectingRef.current = false;
        startPoll();
        attemptRef.current++;
        scheduleReconnect();
        return;
      }

      wsRef.current = ws;

      ws.onopen = () => {
        if (!aliveRef.current || seqRef.current !== mySeq) return;
        connectingRef.current = false;
        attemptRef.current = 0;
        clearPoll();
        clearReconnect();
      };

      ws.onclose = () => {
        if (!aliveRef.current || seqRef.current !== mySeq) return;
        connectingRef.current = false;
        wsRef.current = null;
        startPoll();
        attemptRef.current++;
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (!aliveRef.current || seqRef.current !== mySeq) return;
      };

      ws.onmessage = (ev) => {
        if (!aliveRef.current || seqRef.current !== mySeq) return;
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (!msg) return;

        try {
          if (msg.type === "HELLO" && msg.snapshot) {
            recordSnapshot(msg.snapshot);
          } else if (msg.type === "EVT" && msg.evt) {
            const t = String(msg.evt.type || "");
            if (t === "STATE" && msg.evt.payload) recordSnapshot(msg.evt.payload);
            if (t === "SIGNALS_CLEARED") recordSnapshot({
              status: "stopped",
              session: "–",
              universeCount: 0,
              cooldownLeftMs: 0,
              liveCount: 0,
              signals: []
            });
          }
        } catch (err) {
          console.error("onSnapshot callback crashed:", err);
        }
      };
    };

    startWS();
    if (!wsUrl) startPoll();

    return () => {
      aliveRef.current = false;
      pollInFlightRef.current = false;
      clearPoll();
      clearReconnect();
      stopWS();
    };
  }, [onSnapshot, pollMs, wsUrl]);
}


