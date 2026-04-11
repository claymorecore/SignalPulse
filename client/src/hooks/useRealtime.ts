import { useEffect } from "react";
import { createRealtimeUrl } from "../lib/api/ws";
import { logger } from "../lib/logger";

type RealtimeEvent =
  | { type: "HELLO"; snapshot?: unknown }
  | { type: "EVT"; evt?: { type?: string; payload?: unknown } };

type UseRealtimeOptions = {
  onEvent?: (_event: RealtimeEvent) => void;
  enabled?: boolean;
  path?: string;
};

export default function useRealtime({ onEvent, enabled = true, path = "/ws" }: UseRealtimeOptions) {
  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;
    const socket = new WebSocket(createRealtimeUrl(path));

    socket.onmessage = (message) => {
      if (!active) return;

      try {
        const parsed = JSON.parse(message.data) as RealtimeEvent;
        onEvent?.(parsed);
      } catch (error) {
        logger.warn("Failed to parse realtime payload", { path, error });
      }
    };

    socket.onerror = () => {
      logger.warn("Realtime connection degraded", { path });
    };

    return () => {
      active = false;
      socket.close();
    };
  }, [enabled, onEvent, path]);
}
