const TELEGRAM_BASE_URL = "https://api.telegram.org";

const parseTelegramError = async (response) => {
  let body = null;
  let rawBody = null;
  try {
    rawBody = await response.text();
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {}

  const description = body?.description || `telegram_http_${response.status}`;
  const error = new Error(description);
  error.status = response.status;
  error.code = body?.error_code || response.status;
  error.description = description;
  error.retryAfterSec = Number(body?.parameters?.retry_after || 0) || null;
  error.retryAfterMs = error.retryAfterSec ? error.retryAfterSec * 1000 : null;
  error.responseBody = body;
  error.responseText = rawBody;
  return error;
};

export const createTelegramService = ({
  token,
  chatId,
  fetchImpl = globalThis.fetch,
  logger = console,
  baseUrl = TELEGRAM_BASE_URL
}) => {
  const enabled = !!token && !!chatId && typeof fetchImpl === "function";

  const request = async (method, payload) => {
    if (!enabled) {
      const error = new Error("telegram_not_configured");
      error.code = "telegram_not_configured";
      throw error;
    }

    const response = await fetchImpl(`${baseUrl}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        disable_web_page_preview: true,
        ...payload
      })
    });

    if (!response.ok) {
      const error = await parseTelegramError(response);
      logger.error?.("TELEGRAM_API_HTTP_ERROR", {
        method,
        status: error.status,
        code: error.code,
        description: error.description,
        retryAfterMs: error.retryAfterMs,
        responseBody: error.responseBody,
        responseText: error.responseText
      });
      throw error;
    }

    const body = await response.json();
    if (!body?.ok) {
      const error = new Error(body?.description || "telegram_api_error");
      error.code = body?.error_code || "telegram_api_error";
      error.description = body?.description || "telegram_api_error";
      error.responseBody = body;
      logger.error?.("TELEGRAM_API_ERROR", {
        method,
        code: error.code,
        description: error.description,
        responseBody: body
      });
      throw error;
    }

    return body.result;
  };

  return {
    enabled,
    chatId,
    async sendMessage(text) {
      return request("sendMessage", { text });
    },
    async editMessageText(messageId, text) {
      return request("editMessageText", { message_id: messageId, text });
    },
    isRetryableError(error) {
      const status = Number(error?.status || error?.code);
      if (!Number.isFinite(status)) return true;
      return status >= 500 || status === 429;
    },
    isNotModifiedError(error) {
      return /message is not modified/i.test(String(error?.description || error?.message || ""));
    },
    isEditGoneError(error) {
      return /(message to edit not found|message can't be edited|message identifier is not specified)/i
        .test(String(error?.description || error?.message || ""));
    },
    logger
  };
};

export default {
  createTelegramService
};