import { appConfig } from "../config";

export const createRealtimeUrl = (path = "/ws") => {
  if (appConfig.wsBaseUrl) {
    const normalizedBase = appConfig.wsBaseUrl.endsWith("/")
      ? appConfig.wsBaseUrl.slice(0, -1)
      : appConfig.wsBaseUrl;
    return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = appConfig.isDev ? "localhost:3000" : window.location.host;
  return `${protocol}://${host}${path}`;
};
