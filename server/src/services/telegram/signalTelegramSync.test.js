import assert from "node:assert/strict";
import test from "node:test";

import { createSignalTelegramSync } from "./signalTelegramSync.js";

const createStore = () => {
  const data = new Map();
  return {
    async init() {},
    async list() {
      return Array.from(data.values());
    },
    async upsert(record) {
      data.set(record.signalKey, { ...record });
    },
    async remove(signalKey) {
      data.delete(signalKey);
    },
    async get(signalKey) {
      return data.get(signalKey) || null;
    }
  };
};

const createLogger = () => ({
  calls: [],
  trace(...args) {
    this.calls.push({ level: "trace", args });
  },
  debug(...args) {
    this.calls.push({ level: "debug", args });
  },
  info(...args) {
    this.calls.push({ level: "info", args });
  },
  warn(...args) {
    this.calls.push({ level: "warn", args });
  },
  error(...args) {
    this.calls.push({ level: "error", args });
  }
});

const createImmediateTimers = () => ({
  setTimer(fn) {
    return setTimeout(fn, 0);
  },
  clearTimer(timer) {
    clearTimeout(timer);
  }
});

const baseSignal = () => ({
  key: "BTCUSDT|1m|EMA_ATR|LONG",
  symbol: "BTCUSDT",
  tf: "1m",
  setup: "EMA_ATR",
  side: "LONG",
  status: "OPEN",
  entry: 100,
  sl: 95,
  tp: 110,
  rr: 2,
  live: 101,
  pnlPct: 1,
  pnlUsdt: 5,
  createdAt: 0,
  lastScanTs: 0,
  lastLiveTs: 0,
  history: []
});

test("signalTelegramSync sends once for a new signal and edits the same message on meaningful updates", async () => {
  let nowValue = 10_000;
  const sent = [];
  const edited = [];
  const store = createStore();
  const timers = createImmediateTimers();

  const sync = createSignalTelegramSync({
    telegramStore: store,
    telegramService: {
      enabled: true,
      async sendMessage(text) {
        sent.push(text);
        return { message_id: 321 };
      },
      async editMessageText(messageId, text) {
        edited.push({ messageId, text });
        return { ok: true };
      },
      isNotModifiedError() {
        return false;
      },
      isEditGoneError() {
        return false;
      }
    },
    logger: createLogger(),
    nowFn: () => nowValue,
    throttleMs: 3_000,
    minRequestGapMs: 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer
  });

  await sync.start();
  await sync.onSignalUpsert(baseSignal(), { existed: false });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(sent.length, 1);
  assert.equal(edited.length, 0);

  nowValue = 10_200;
  await sync.onSignalUpsert({ ...baseSignal(), live: 101.5, pnlPct: 1.5, pnlUsdt: 7.5 }, { existed: true });
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.equal(sent.length, 1);
  assert.equal(edited.length, 1);
  assert.equal(edited[0].messageId, 321);

  const record = await store.get(baseSignal().key);
  assert.equal(record.telegramMessageId, 321);
  assert.equal(record.status, "OPEN");
  assert.ok(record.lastSentHash);
});

test("signalTelegramSync skips duplicate text and sends terminal updates immediately", async () => {
  let nowValue = 20_000;
  const sent = [];
  const edited = [];
  const timers = createImmediateTimers();

  const sync = createSignalTelegramSync({
    telegramStore: createStore(),
    telegramService: {
      enabled: true,
      async sendMessage(text) {
        sent.push(text);
        return { message_id: 555 };
      },
      async editMessageText(messageId, text) {
        edited.push({ messageId, text });
        return { ok: true };
      },
      isNotModifiedError() {
        return false;
      },
      isEditGoneError() {
        return false;
      }
    },
    logger: createLogger(),
    nowFn: () => nowValue,
    throttleMs: 5_000,
    minRequestGapMs: 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer
  });

  await sync.start();
  await sync.onSignalUpsert(baseSignal(), { existed: false });
  await new Promise((resolve) => setTimeout(resolve, 0));

  nowValue = 20_100;
  await sync.onSignalUpsert(baseSignal(), { existed: true });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(sent.length, 1);
  assert.equal(edited.length, 0);

  nowValue = 20_200;
  await sync.onSignalRemoved({ ...baseSignal(), live: 94, pnlPct: -6, pnlUsdt: -30 }, { reason: "SL" });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(sent.length, 1);
  assert.equal(edited.length, 1);
  assert.match(edited[0].text, /^Status: SL/m);
});

test("signalTelegramSync start logs a clear error when backend env is missing", async () => {
  const logger = createLogger();
  const sync = createSignalTelegramSync({
    token: "",
    chatId: "",
    telegramService: {
      enabled: false
    },
    telegramStore: createStore(),
    logger
  });

  await sync.start();

  const disabledLog = logger.calls.find((entry) => entry.args[0] === "TELEGRAM_SYNC_DISABLED");
  assert.ok(disabledLog);
  assert.deepEqual(disabledLog.args[1].missing, ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]);
});

test("signalTelegramSync startup probe sends one controlled message only when enabled", async () => {
  const logger = createLogger();
  const sent = [];
  const sync = createSignalTelegramSync({
    token: "token",
    chatId: "-100123",
    telegramStore: createStore(),
    telegramService: {
      enabled: true,
      async sendMessage(text) {
        sent.push(text);
        return { message_id: 777 };
      },
      async editMessageText() {
        return { ok: true };
      },
      isNotModifiedError() {
        return false;
      },
      isEditGoneError() {
        return false;
      }
    },
    logger,
    startupProbeEnabled: true,
    startupProbeText: "SignalPulse Telegram sync probe"
  });

  await sync.start();

  assert.deepEqual(sent, ["SignalPulse Telegram sync probe"]);
  const probeLog = logger.calls.find((entry) => entry.args[0] === "TELEGRAM_SYNC_PROBE_SENT");
  assert.ok(probeLog);
  assert.equal(probeLog.args[1].messageId, 777);
});

test("signalTelegramSync serializes outbound sends with a global request gap", async () => {
  const sendTimes = [];
  const sync = createSignalTelegramSync({
    token: "token",
    chatId: "-100123",
    telegramStore: createStore(),
    telegramService: {
      enabled: true,
      async sendMessage() {
        sendTimes.push(Date.now());
        return { message_id: 900 + sendTimes.length };
      },
      async editMessageText() {
        return { ok: true };
      },
      isNotModifiedError() {
        return false;
      },
      isEditGoneError() {
        return false;
      }
    },
    logger: createLogger(),
    minRequestGapMs: 40
  });

  await sync.start();
  await Promise.all([
    sync.onSignalUpsert(baseSignal(), { existed: false }),
    sync.onSignalUpsert({
      ...baseSignal(),
      key: "ETHUSDT|1m|EMA_ATR|LONG",
      symbol: "ETHUSDT"
    }, { existed: false })
  ]);

  await new Promise((resolve) => setTimeout(resolve, 120));

  assert.equal(sendTimes.length, 2);
  assert.ok(sendTimes[1] - sendTimes[0] >= 30);
});

test("signalTelegramSync does not create a duplicate message when an update arrives during the first send", async () => {
  const sent = [];
  const edited = [];
  let releaseSend;

  const sync = createSignalTelegramSync({
    token: "token",
    chatId: "-100123",
    telegramStore: createStore(),
    telegramService: {
      enabled: true,
      async sendMessage(text) {
        sent.push(text);
        await new Promise((resolve) => {
          releaseSend = resolve;
        });
        return { message_id: 999 };
      },
      async editMessageText(messageId, text) {
        edited.push({ messageId, text });
        return { ok: true };
      },
      isNotModifiedError() {
        return false;
      },
      isEditGoneError() {
        return false;
      }
    },
    logger: createLogger(),
    minRequestGapMs: 0
  });

  await sync.start();
  const first = sync.onSignalUpsert(baseSignal(), { existed: false });
  while (typeof releaseSend !== "function") {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const second = sync.onSignalUpsert(
    { ...baseSignal(), live: 102, pnlPct: 2, pnlUsdt: 10 },
    { existed: true }
  );

  releaseSend();
  await first;
  await second;
  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.equal(sent.length, 1);
  assert.equal(edited.length, 1);
  assert.equal(edited[0].messageId, 999);
});

test("signalTelegramSync purgeQueue drops pending sends and retries on stop/reset", async () => {
  const sent = [];
  const scheduled = [];
  let timerId = 0;

  const sync = createSignalTelegramSync({
    token: "token",
    chatId: "-100123",
    telegramStore: createStore(),
    telegramService: {
      enabled: true,
      async sendMessage(text) {
        sent.push(text);
        return { message_id: 1234 };
      },
      async editMessageText() {
        return { ok: true };
      },
      isNotModifiedError() {
        return false;
      },
      isEditGoneError() {
        return false;
      }
    },
    logger: createLogger(),
    setTimer(fn, delayMs) {
      const timer = { id: ++timerId, fn, delayMs };
      scheduled.push(timer);
      return timer;
    },
    clearTimer(timer) {
      const index = scheduled.findIndex((entry) => entry.id === timer?.id);
      if (index >= 0) scheduled.splice(index, 1);
    }
  });

  await sync.start();
  await sync.onSignalUpsert(baseSignal(), { existed: false });

  assert.equal(scheduled.length, 1);
  await sync.purgeQueue();

  assert.equal(scheduled.length, 0);
  assert.equal(sent.length, 0);
});
