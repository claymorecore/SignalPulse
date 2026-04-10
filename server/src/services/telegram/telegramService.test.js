import assert from "node:assert/strict";
import test from "node:test";

import { createTelegramService } from "./telegramService.js";

const createLogger = () => ({
  calls: [],
  error(...args) {
    this.calls.push(args);
  }
});

test("telegramService logs full Bot API HTTP error responses", async () => {
  const logger = createLogger();
  const service = createTelegramService({
    token: "token",
    chatId: "-100123",
    logger,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error_code: 400,
          description: "Bad Request: chat not found"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
  });

  await assert.rejects(() => service.sendMessage("probe"), /chat not found/i);

  assert.equal(logger.calls.length, 1);
  assert.equal(logger.calls[0][0], "TELEGRAM_API_HTTP_ERROR");
  assert.equal(logger.calls[0][1].status, 400);
  assert.equal(logger.calls[0][1].description, "Bad Request: chat not found");
  assert.deepEqual(logger.calls[0][1].responseBody, {
    ok: false,
    error_code: 400,
    description: "Bad Request: chat not found"
  });
});

test("telegramService exposes retry_after as retryAfterMs for rate limit handling", async () => {
  const logger = createLogger();
  const service = createTelegramService({
    token: "token",
    chatId: "-100123",
    logger,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error_code: 429,
          description: "Too Many Requests: retry later",
          parameters: { retry_after: 7 }
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" }
        }
      )
  });

  await assert.rejects(async () => {
    try {
      await service.sendMessage("probe");
    } catch (error) {
      assert.equal(error.retryAfterSec, 7);
      assert.equal(error.retryAfterMs, 7000);
      throw error;
    }
  }, /too many requests/i);
});
