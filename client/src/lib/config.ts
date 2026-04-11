export const appConfig = {
  env: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  debug: import.meta.env.DEV || import.meta.env.VITE_DEBUG === "true",
  apiBaseUrl: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000" : ""),
  wsBaseUrl: import.meta.env.VITE_WS_URL || "",
  featureFlags: {
    performanceTracking: true,
    userFlowTracking: true,
    errorTracking: true,
  },
} as const;

export type AppConfig = typeof appConfig;
