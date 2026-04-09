import { useEffect, useRef, useState } from "react";

/**
 * Custom hook to maintain a persistent WebSocket connection with automatic reconnection.
 *
 * @param {Object} options
 * @param {function} options.onSnapshot - callback invoked with snapshot or event payload
 * @returns {Object} { wsOk: boolean, lastErr: any }
 */
export default function useWS({ onSnapshot }) {
  const [wsOk, setWsOk] = useState(false);
  const [lastErr, setLastErr] = useState(null);
  const [lastSnapshotAt, setLastSnapshotAt] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const aliveRef = useRef(false);
  const attemptRef = useRef(0);
  const seqRef = useRef(0);

  useEffect(() => {
    aliveRef.current = true;
    seqRef.current += 1;
    const mySeq = seqRef.current;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const closeWS = () => {
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      }
      wsRef.current = null;
    };

    const scheduleReconnect = () => {
      if (!aliveRef.current || seqRef.current !== mySeq) return;
      clearTimer();

      const attempt = Math.min(8, attemptRef.current || 0);
      const base = 1200 * Math.pow(1.6, attempt);
      const jitter = base * 0.2 * Math.random();
      const wait = Math.min(10000, Math.floor(base + jitter));

      timerRef.current = setTimeout(connect, wait);
    };

    const connect = () => {
      if (!aliveRef.current || seqRef.current !== mySeq) return;

      const existing = wsRef.current;
      if (existing && (existing.readyState === 0 || existing.readyState === 1)) return;

      clearTimer();

      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const host =
        import.meta.env.DEV ? "localhost:3000" : window.location.host;
      const url = `${proto}://${host}/ws`;

      let ws;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        setLastErr(e);
        setWsOk(false);
        attemptRef.current++;
        setReconnectAttempts(attemptRef.current);
        scheduleReconnect();
        return;
      }

      wsRef.current = ws;

      ws.onopen = () => {
        if (!aliveRef.current || seqRef.current !== mySeq) return;
        attemptRef.current = 0;
        setReconnectAttempts(0);
        setLastErr(null);
        setWsOk(true);
      };

      ws.onclose = () => {
        if (!aliveRef.current || seqRef.current !== mySeq) return;
        setWsOk(false);
        wsRef.current = null;
        attemptRef.current++;
        setReconnectAttempts(attemptRef.current);
        scheduleReconnect();
      };

      ws.onerror = (e) => {
        setLastErr(e);
      };

      ws.onmessage = (ev) => {
        if (!aliveRef.current || seqRef.current !== mySeq) return;
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (!msg) return;

        try {
          if (msg.type === "HELLO" && msg.snapshot) {
            onSnapshot?.(msg.snapshot);
            setLastSnapshotAt(Date.now());
          } else if (msg.type === "EVT" && msg.evt) {
            const t = String(msg.evt.type || "");
            if (t === "STATE" && msg.evt.payload) {
              onSnapshot?.(msg.evt.payload);
              setLastSnapshotAt(Date.now());
            }
            if (t === "SIGNALS_CLEARED") {
              onSnapshot?.({
                status: "stopped",
                session: "–",
                universe: [],
                signals: [],
                cooldownLeftMs: 0,
                liveCount: 0
              });
              setLastSnapshotAt(Date.now());
            }
          }
        } catch (err) {
          console.error("onSnapshot callback crashed:", err);
        }
      };
    };

    connect();

    return () => {
      aliveRef.current = false;
      clearTimer();
      closeWS();
      setWsOk(false);
    };
  }, [onSnapshot]);

  return { wsOk, lastErr, lastSnapshotAt, reconnectAttempts };
}
