import { useCallback, useReducer, useMemo } from "react";
import { normalizeSnapshot } from "../lib/normalize.js";

// Initial store state
const initialState = {
  status: "idle",
  session: "–",
  universeCount: 0,
  signals: [],
  signalsByKey: new Map(),
  cooldownLeftMs: 0,
  liveCount: 0,
  selectedKey: null
};

// Helper: builds internal state from a normalized snapshot
const buildStateFromSnapshot = (snapshot) => {
  const snap = normalizeSnapshot(snapshot);
  const signalsByKey = new Map();

  if (Array.isArray(snap.signals)) {
    snap.signals.forEach(signal => {
      if (signal?.key) signalsByKey.set(signal.key, signal);
    });
  }

  return {
    status: snap.status || "idle",
    session: snap.session || "–",
    universeCount: Number.isFinite(snap.universeCount) ? snap.universeCount : 0,
    signals: Array.isArray(snap.signals) ? snap.signals : [],
    signalsByKey,
    cooldownLeftMs: Number.isFinite(snap.cooldownLeftMs) ? snap.cooldownLeftMs : 0,
    liveCount: Number.isFinite(snap.liveCount) ? snap.liveCount : 0
  };
};

// Reducer function
const reducer = (state, action) => {
  switch (action.type) {
    case "SNAPSHOT": {
      const next = buildStateFromSnapshot(action.snapshot);
      let selectedKey = state.selectedKey;

      // Clear selection if the key no longer exists
      if (selectedKey && !next.signalsByKey.has(selectedKey)) {
        selectedKey = null;
      }

      return { ...state, ...next, selectedKey };
    }

    case "SELECT":
      return { ...state, selectedKey: action.key || null };

    case "CLEAR_SELECT":
      return { ...state, selectedKey: null };

    default:
      return state;
  }
};

// Custom hook
export default function useSignalStore() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Actions
  const applySnapshot = useCallback((snapshot) => {
    dispatch({ type: "SNAPSHOT", snapshot });
  }, []);

  const select = useCallback((key) => {
    dispatch({ type: "SELECT", key });
  }, []);

  const clearSelect = useCallback(() => {
    dispatch({ type: "CLEAR_SELECT" });
  }, []);

  // Memoized selected signal for performance
  const selected = useMemo(() => {
    if (!state.selectedKey) return null;
    return state.signalsByKey.get(state.selectedKey) || null;
  }, [state.selectedKey, state.signalsByKey]);

  return {
    state,
    applySnapshot,
    select,
    clearSelect,
    selected
  };
}