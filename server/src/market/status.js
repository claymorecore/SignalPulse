import state from "./state.js";

const now = () => Date.now();

const health = () => {
  const s = state.S;

  return {
    ts: now(),                        // current timestamp
    bootTs: s.bootTs,                  // timestamp when the system started
    uptimeMs: now() - s.bootTs,        // how long the system has been running (ms)
    session: s.session,                // current session number
    status: s.status,                  // "running", "stopped", or "idle"
    universeCount: Array.isArray(s.universe) ? s.universe.length : 0, // # of symbols tracked
    signalsCount: s.signals ? s.signals.size : 0,  // total signals in memory
    liveCount: s.liveCount,            // number of active/live signals
    cooldownLeftMs: state.cooldownLeftMs(), // remaining cooldown in ms
    stateSeq: s.stateSeq               // sequence number of the last emitted state
  };
};

export default { health };