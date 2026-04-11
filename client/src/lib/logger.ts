import { appConfig } from "./config";

type LogLevel = "info" | "warn" | "error";
type LogMeta = Record<string, unknown> | undefined;

const shouldLog = (level: LogLevel) => {
  if (appConfig.isDev) return true;
  return level === "error";
};

const writeLog = (level: LogLevel, message: string, meta?: LogMeta) => {
  if (!shouldLog(level)) return;

  const payload = meta ? [`[SignalPulse:${level}]`, message, meta] : [`[SignalPulse:${level}]`, message];
  if (level === "error") console.error(...payload);
  else if (level === "warn") console.warn(...payload);
  else console.info(...payload);
};

export const logger = {
  info: (message: string, meta?: LogMeta) => writeLog("info", message, meta),
  warn: (message: string, meta?: LogMeta) => writeLog("warn", message, meta),
  error: (message: string, meta?: LogMeta) => writeLog("error", message, meta),
};
