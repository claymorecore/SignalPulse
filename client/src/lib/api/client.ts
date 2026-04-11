import { appConfig } from "../config";

export type ApiError = Error & {
  status?: number;
  data?: unknown;
};

const DEFAULT_TIMEOUT_MS = 8000;

const joinUrl = (base: string, path: string) => {
  if (/^https?:\/\//.test(path)) return path;
  if (!base) return path;

  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const parseResponse = async (response: Response) => {
  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : `http_${response.status}`;

    const error: ApiError = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const createTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timer)
  };
};

type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

export const request = async <T>(path: string, options: RequestOptions = {}) => {
  const timeout = createTimeoutSignal(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(joinUrl(appConfig.apiBaseUrl, path), {
      ...options,
      signal: options.signal ?? timeout.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

    return (await parseResponse(response)) as T;
  } finally {
    timeout.clear();
  }
};

export const apiGet = <T>(path: string, options: RequestOptions = {}) =>
  request<T>(path, {
    ...options,
    method: "GET",
    cache: "no-store"
  });

export const apiPost = <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
  request<T>(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(body || {})
  });
