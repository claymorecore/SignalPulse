import crypto from "crypto";
import env from "../../config/env.js";
import { log } from "../../middleware/log.js";
import { renderSignalTelegramText } from "./telegramFormatter.js";
import { createTelegramService } from "./telegramService.js";
import { createTelegramStore } from "./telegramStore.js";

const OPEN_STATUS = "OPEN";
const INVALIDATED_STATUS = "INVALIDATED";
const DEFAULT_THROTTLE_MS = 3000;
const DEFAULT_GLOBAL_REQUEST_GAP_MS = 1500;
const MAX_RETRY_MS = 60000;

const now = () => Date.now();
const hashText = (text) => crypto.createHash("sha1").update(String(text || "")).digest("hex");
const cloneSignal = (signal, patch = {}) => ({ ...(signal || {}), ...patch });

const buildBackoffMs = (retryCount) => Math.min(MAX_RETRY_MS, 2000 * Math.pow(2, Math.max(0, retryCount)));

const createEmptyRecord = (signalKey) => ({
  signalKey,
  telegramMessageId: null,
  lastSentHash: null,
  lastUpdateTs: 0,
  status: "",
  pendingText: null,
  retryCount: 0,
  nextRetryTs: null
});

export const createSignalTelegramSync = ({
  token = env.TELEGRAM_BOT_TOKEN,
  chatId = env.TELEGRAM_CHAT_ID,
  telegramService = createTelegramService({
    token,
    chatId,
    logger: log
  }),
  telegramStore = createTelegramStore(),
  logger = log,
  nowFn = now,
  throttleMs = DEFAULT_THROTTLE_MS,
  minRequestGapMs = DEFAULT_GLOBAL_REQUEST_GAP_MS,
  startupProbeEnabled = env.TELEGRAM_SYNC_STARTUP_PROBE,
  startupProbeText = env.TELEGRAM_SYNC_STARTUP_PROBE_TEXT,
  setTimer = setTimeout,
  clearTimer = clearTimeout
} = {}) => {
  const records = new Map();
  const desired = new Map();
  const timers = new Map();
  let outboundLock = Promise.resolve();
  let nextRequestAt = 0;
  let initPromise = null;

  const enabled = !!telegramService?.enabled;

  const validateConfiguration = () => {
    if (enabled) {
      logger.info("TELEGRAM_SYNC_READY", {
        configured: true,
        hasToken: true,
        chatIdType: /^-?\d+$/.test(String(chatId || "")) ? "numeric" : "string"
      });
      return true;
    }

    logger.error("TELEGRAM_SYNC_DISABLED", {
      reason: "missing_backend_env",
      missing: [
        !token ? "TELEGRAM_BOT_TOKEN" : null,
        !chatId ? "TELEGRAM_CHAT_ID" : null
      ].filter(Boolean)
    });
    return false;
  };

  const ensureInit = async () => {
    if (!enabled) return;
    if (!initPromise) {
      initPromise = (async () => {
        await telegramStore.init();
        const existing = await telegramStore.list();
        for (const record of existing) records.set(record.signalKey, record);
      })();
    }
    await initPromise;
  };

  const persistRecord = async (record) => {
    records.set(record.signalKey, record);
    await telegramStore.upsert(record);
  };

  const clearScheduled = (signalKey) => {
    const timer = timers.get(signalKey);
    if (timer) {
      try { clearTimer(timer); } catch {}
      timers.delete(signalKey);
    }
  };

  const schedule = (signalKey, delayMs = 0) => {
    clearScheduled(signalKey);
    const timer = setTimer(() => {
      timers.delete(signalKey);
      processSignal(signalKey).catch((error) => {
        logger.warn("TELEGRAM_SYNC_PROCESS_FAIL", {
          signalKey,
          err: error?.message || String(error)
        });
      });
    }, Math.max(0, delayMs));
    timer?.unref?.();
    timers.set(signalKey, timer);
  };

  const waitForMs = (delayMs) =>
    new Promise((resolve) => {
      const timer = setTimer(resolve, Math.max(0, delayMs));
      timer?.unref?.();
    });

  const runTelegramRequest = async (task) => {
    const requestPromise = outboundLock.then(async () => {
      const delayMs = Math.max(0, nextRequestAt - nowFn());
      if (delayMs > 0) await waitForMs(delayMs);

      try {
        return await task();
      } finally {
        nextRequestAt = nowFn() + Math.max(0, minRequestGapMs);
      }
    });

    outboundLock = requestPromise.catch(() => {});
    return await requestPromise;
  };

  const finalizeSuccess = async (signalKey, record, payload) => {
    const nextRecord = {
      ...record,
      telegramMessageId: payload.telegramMessageId ?? record.telegramMessageId ?? null,
      lastSentHash: payload.hash,
      lastUpdateTs: nowFn(),
      status: payload.status,
      pendingText: null,
      retryCount: 0,
      nextRetryTs: null
    };
    desired.delete(signalKey);
    await persistRecord(nextRecord);
  };

  const handleFailure = async (signalKey, record, target, error) => {
    const retryCount = (record.retryCount || 0) + 1;
    const retryDelayMs = Math.max(error?.retryAfterMs || 0, buildBackoffMs(retryCount));
    const nextRetryTs = nowFn() + retryDelayMs;
    const nextRecord = {
      ...record,
      lastUpdateTs: nowFn(),
      status: target.status,
      pendingText: target.text,
      retryCount,
      nextRetryTs
    };

    await persistRecord(nextRecord);

    logger.warn("TELEGRAM_SYNC_RETRY", {
      signalKey,
      err: error?.message || String(error),
      retryCount,
      retryInMs: retryDelayMs,
      retryAfterMs: error?.retryAfterMs || null
    });

    schedule(signalKey, retryDelayMs);
  };

  const processSignal = async (signalKey) => {
    if (!enabled) return;
    await ensureInit();

    const target = desired.get(signalKey);
    if (!target) return;

    const record = records.get(signalKey) || createEmptyRecord(signalKey);
    const currentTs = nowFn();

    if (record.nextRetryTs && record.nextRetryTs > currentTs) {
      schedule(signalKey, record.nextRetryTs - currentTs);
      return;
    }

    if (record.telegramMessageId && record.lastSentHash === target.hash) {
      await finalizeSuccess(signalKey, record, target);
      return;
    }

    try {
      if (!record.telegramMessageId) {
        const message = await runTelegramRequest(() => telegramService.sendMessage(target.text));
        await finalizeSuccess(signalKey, record, {
          ...target,
          telegramMessageId: Number(message?.message_id)
        });
        return;
      }

      try {
        await runTelegramRequest(() => telegramService.editMessageText(record.telegramMessageId, target.text));
        await finalizeSuccess(signalKey, record, target);
      } catch (error) {
        if (telegramService.isNotModifiedError(error)) {
          await finalizeSuccess(signalKey, record, target);
          return;
        }

        if (telegramService.isEditGoneError(error)) {
          logger.warn("TELEGRAM_EDIT_FALLBACK_SEND", {
            signalKey,
            err: error?.message || String(error)
          });

          const message = await runTelegramRequest(() => telegramService.sendMessage(target.text));
          await finalizeSuccess(signalKey, record, {
            ...target,
            telegramMessageId: Number(message?.message_id)
          });
          return;
        }

        throw error;
      }
    } catch (error) {
      await handleFailure(signalKey, record, target, error);
    }
  };

  const queueSignal = async (signal, { force = false } = {}) => {
    if (!enabled || !signal?.key) return;
    await ensureInit();

    const signalKey = String(signal.key);
    const text = renderSignalTelegramText(signal, { now: nowFn() });
    const hash = hashText(text);
    const status = String(signal.status || "");
    const record = records.get(signalKey) || createEmptyRecord(signalKey);

    if (!force && record.lastSentHash === hash && record.status === status) return;

    desired.set(signalKey, { text, hash, status });

    const shouldSendImmediately = !record.telegramMessageId || status !== OPEN_STATUS;
    const lastTs = Number(record.lastUpdateTs || 0);
    const delayMs = shouldSendImmediately ? 0 : Math.max(0, throttleMs - (nowFn() - lastTs));

    const nextRecord = {
      ...record,
      lastUpdateTs: nowFn(),
      status,
      pendingText: text
    };
    await persistRecord(nextRecord);
    schedule(signalKey, delayMs);
  };

  return {
    async start() {
      if (!validateConfiguration()) return;
      await ensureInit();
      if (!startupProbeEnabled) return;

      try {
        const message = await runTelegramRequest(() => telegramService.sendMessage(startupProbeText));
        logger.info("TELEGRAM_SYNC_PROBE_SENT", {
          messageId: Number(message?.message_id) || null
        });
      } catch (error) {
        logger.error("TELEGRAM_SYNC_PROBE_FAIL", {
          err: error?.message || String(error),
          code: error?.code || null,
          description: error?.description || null,
          responseBody: error?.responseBody || null,
          responseText: error?.responseText || null
        });
      }
    },

    async stop() {
      for (const signalKey of timers.keys()) clearScheduled(signalKey);
    },

    async onSignalUpsert(signal, { existed = false } = {}) {
      if (!enabled || !signal?.key) return;

      if (!existed && String(signal.status || "").toUpperCase() === OPEN_STATUS) {
        await queueSignal(signal, { force: true });
        return;
      }

      const record = records.get(String(signal.key));
      if (!record && String(signal.status || "").toUpperCase() !== OPEN_STATUS) {
        await queueSignal(signal, { force: true });
        return;
      }

      await queueSignal(signal);
    },

    async onSignalRemoved(signal, { reason = INVALIDATED_STATUS } = {}) {
      if (!enabled || !signal?.key) return;
      const nextSignal = cloneSignal(signal, {
        status: signal?.status && String(signal.status).toUpperCase() !== OPEN_STATUS
          ? signal.status
          : reason
      });
      await queueSignal(nextSignal, { force: true });
    },

    async onSignalsCleared(signals, { reason = INVALIDATED_STATUS } = {}) {
      if (!enabled || !Array.isArray(signals) || !signals.length) return;
      for (const signal of signals) {
        await this.onSignalRemoved(signal, { reason });
      }
    }
  };
};

const signalTelegramSync = createSignalTelegramSync();

export default signalTelegramSync;
