import { useCallback, useReducer, useMemo } from "react";
import { normalizeSnapshot } from "../lib/normalize.js";

// Initial store state
const initialState = {
  status: "idle",
  session: null,
  universeCount: 0,
  signals: [],
  cooldownLeftMs: 0,
  liveCount: 0,
  selectedKey: null
};

// Helper: builds internal state from a normalized snapshot
const buildStateFromSnapshot = (snapshot) => {
  const snap = normalizeSnapshot(snapshot);

  return {
    status: typeof snap.status === "string" && snap.status.trim()
      ? snap.status
      : "idle",

    session: snap.session ?? null,

    universeCount: Number.isFinite(snap.universeCount)
      ? snap.universeCount
      : 0,

    signals: Array.isArray(snap.signals)
      ? snap.signals
      : [],

    cooldownLeftMs: Number.isFinite(snap.cooldownLeftMs)
      ? snap.cooldownLeftMs
      : 0,

    liveCount: Number.isFinite(snap.liveCount)
      ? snap.liveCount
      : 0
  };
};

// Reducer function
const reducer = (state, action) => {
  switch (action.type) {
    case "SNAPSHOT": {
      const next = buildStateFromSnapshot(action.snapshot);
      let selectedKey = state.selectedKey;

      const nextKeys = new Set(
        next.signals.map((signal) => signal?.key).filter(Boolean)
      );

      // Clear selection if the key no longer exists
      if (selectedKey && !nextKeys.has(selectedKey)) {
        selectedKey = null;
      }

      return {
        ...state,
        ...next,
        selectedKey
      };
    }

    case "SELECT":
      return {
        ...state,
        selectedKey: action.key || null
      };

    case "CLEAR_SELECT":
      return {
        ...state,
        selectedKey: null
      };

    default:
      return state;
  }
};

// Custom hook
export default function useSignalStore() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const signalsByKey = useMemo(() => {
    const next = new Map();

    for (const signal of state.signals) {
      if (signal?.key) {
        next.set(signal.key, signal);
      }
    }

    return next;
  }, [state.signals]);

  const applySnapshot = useCallback((snapshot) => {
    dispatch({ type: "SNAPSHOT", snapshot });
  }, []);

  const select = useCallback((key) => {
    dispatch({ type: "SELECT", key });
  }, []);

  const clearSelect = useCallback(() => {
    dispatch({ type: "CLEAR_SELECT" });
  }, []);

  const selected = useMemo(() => {
    if (!state.selectedKey) return null;
    return signalsByKey.get(state.selectedKey) || null;
  }, [state.selectedKey, signalsByKey]);

  return {
    state,
    applySnapshot,
    select,
    clearSelect,
    selected
  };
}