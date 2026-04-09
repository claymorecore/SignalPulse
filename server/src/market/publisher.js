// eventBus.js
import { EventEmitter } from "events";

// Create an event emitter instance
const emitter = new EventEmitter();
emitter.setMaxListeners(1000); // increase max listeners to avoid warnings

// Global sequence counter
let seq = 0;

// Helper to get current timestamp
const now = () => Date.now();

// Store "onAny" listeners
const anyListeners = new Set();

/**
 * Publish an event
 * @param {string} type - event type
 * @param {*} payload - optional payload
 * @returns {object} the event object
 */
const publish = (type, payload) => {
  const evt = {
    seq: ++seq,
    type,
    ts: now(),
    payload: payload ?? null
  };

  // Emit event to specific listeners
  try { emitter.emit(type, evt); } catch {}

  // Emit event to wildcard listeners
  try { emitter.emit("*", evt); } catch {}

  // Notify all onAny listeners
  for (const fn of anyListeners) {
    try { fn(evt); } catch {}
  }

  return evt;
};

/**
 * Add a listener for a specific event type
 * @param {string} type 
 * @param {function} fn 
 * @returns {function} a function to remove the listener
 */
const on = (type, fn) => {
  if (typeof fn !== "function") return () => {};
  emitter.on(type, fn);

  return () => {
    try { emitter.off(type, fn); } catch {}
  };
};

/**
 * Add a one-time listener
 * @param {string} type 
 * @param {function} fn 
 * @returns {function} a function to remove the listener
 */
const once = (type, fn) => {
  if (typeof fn !== "function") return () => {};
  emitter.once(type, fn);

  return () => {
    try { emitter.off(type, fn); } catch {}
  };
};

/**
 * Add a listener for all events
 * @param {function} fn 
 * @returns {function} a function to remove the listener
 */
const onAny = (fn) => {
  if (typeof fn !== "function") return () => {};
  anyListeners.add(fn);

  return () => {
    try { anyListeners.delete(fn); } catch {}
  };
};

/**
 * Remove all listeners
 */
const removeAll = () => {
  try { emitter.removeAllListeners(); } catch {}
  anyListeners.clear();
};

/**
 * Get statistics about current listeners
 */
const stats = () => {
  const names = emitter.eventNames();
  const map = {};

  for (const k of names) {
    try { map[String(k)] = emitter.listenerCount(k); } catch {}
  }

  return {
    seq,
    listeners: map,
    any: anyListeners.size
  };
};

// Export the API
export default {
  publish,
  on,
  once,
  onAny,
  removeAll,
  stats
};