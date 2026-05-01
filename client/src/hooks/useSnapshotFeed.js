import { useEffect, useRef } from "react";
import { apiGet } from "../lib/api.js";

/**
 * Keep the snapshot store updated via WebSocket with polling fallback.
 *
 * @param {Object} options
 * @param {function} options.onSnapshot - callback invoked with new snapshots
 * @param {function} options.onEvent - callback invoked with non-state websocket events
 * @param {number} options.pollMs - polling interval (default 1200ms)
 * @param {string|null} options.wsUrl - WebSocket URL (optional)
 */
export default function useSnapshotFeed({
  onSnapshot,
  onEvent,
  pollMs = 1200,
  wsUrl = null
}) {
  const aliveRef = useRef(false);
  const wsRef = useRef(null);
  const pollTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const seqRef = useRef(0);
  const connectingRef = useRef(false);
  const attemptRef = useRef(0);
  const abortControllerRef = useRef(null);
  const pollInFlightRef = useRef(false);
  const onSnapshotRef = useRef(onSnapshot);
  const onEventRef = useRef(onEvent);
  const lastSnapshotRef = useRef(null);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    aliveRef.current = true;
    seqRef.current += 1;
    const mySeq = seqRef.current;

    const isSnapshotLike = (snap) =>
      !!snap &&
      typeof snap === "object" &&
      (
        Array.isArray(snap.signals) ||
        typeof snap.status === "string" ||
        typeof snap.universeCount === "number" ||
        typeof snap.liveCount === "number"
      );

    const recordSnapshot = (snap) => {
      if (!isSnapshotLike(snap)) return;
      lastSnapshotRef.current = snap;

      try {
        onSnapshotRef.current?.(snap);
      } catch (err) {
        console.error("onSnapshot callback crashed:", err);
      }
    };

    const recordEvent = (evt) => {
      if (!evt || typeof evt !== "object") return;

      try {
        onEventRef.current?.(evt);
      } catch (err) {
        console.error("onEvent callback crashed:", err);
      }
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

        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          try {
            ws.close();
          } catch {}
        }
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
        const snap = await apiGet("/api/market/state", {
          signal: abortControllerRef.current.signal
        });

        if (!aliveRef.current || seqRef.current !== mySeq) return;
        recordSnapshot(snap);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("pollOnce failed:", err);
        }
      } finally {
        pollInFlightRef.current = false;
      }
    };

    const startPoll = () => {
      if (!aliveRef.current || seqRef.current !== mySeq || pollTimerRef.current) return;

      pollOnce();
      pollTimerRef.current = setInterval(
        pollOnce,
        Math.max(500, Number(pollMs) || 1200)
      );
    };

    const scheduleReconnect = () => {
      if (!aliveRef.current || seqRef.current !== mySeq) return;

      clearReconnect();

      const attempt = Math.min(8, attemptRef.current || 0);
      const base = 1000 * Math.pow(1.6, attempt);
      const jitter = Math.floor(base * 0.2 * Math.random());
      const wait = Math.min(10000, Math.floor(base + jitter));

      reconnectTimerRef.current = setTimeout(() => {
        startWS();
      }, wait);
    };

    const startWS = () => {
      if (!aliveRef.current || seqRef.current !== mySeq) return;

      if (!wsUrl) {
        startPoll();
        return;
      }

      if (connectingRef.current) return;

      const existing = wsRef.current;
      if (existing && (existing.readyState === WebSocket.CONNECTING || existing.readyState === WebSocket.OPEN)) {
        return;
      }

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

      ws.onerror = (err) => {
        if (!aliveRef.current || seqRef.current !== mySeq) return;
        console.warn("snapshot feed websocket error", err);
      };

      ws.onmessage = (ev) => {
        if (!aliveRef.current || seqRef.current !== mySeq) return;

        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }

        if (!msg || typeof msg !== "object") return;

        if (msg.type === "HELLO" && msg.snapshot) {
          recordSnapshot(msg.snapshot);
          return;
        }

        if (msg.type === "EVT" && msg.evt) {
          const eventType = String(msg.evt.type || "");

          recordEvent(msg.evt);

          if (eventType === "STATE" && msg.evt.payload) {
            recordSnapshot(msg.evt.payload);
            return;
          }

          if (eventType === "SIGNALS_CLEARED") {
            const prev = lastSnapshotRef.current || {};
            recordSnapshot({
              ...prev,
              status: "stopped",
              cooldownLeftMs: 0,
              liveCount: 0,
              signals: []
            });
          }
        }
      };
    };

    startWS();

    return () => {
      aliveRef.current = false;
      pollInFlightRef.current = false;
      clearPoll();
      clearReconnect();
      stopWS();
    };
  }, [pollMs, wsUrl]);
}