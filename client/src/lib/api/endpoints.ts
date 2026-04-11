import type {
  ApiContentItem,
  ApiDashboardSummary,
  ApiListResponse,
  ApiMarketAsset,
  ApiMarketOverview,
  ApiMarketStructure,
  ApiMetric,
  ApiNewsItem,
  ApiSignal
} from "../../types/api";
import { apiGet, apiPost } from "./client";

export const getMarketOverview = async () => {
  const response = await apiGet<{ ok: true; overview: ApiMarketOverview }>("/api/market/overview");
  return response.overview;
};

export const getMarketStructure = async () => {
  const response = await apiGet<{ ok: true; structure: ApiMarketStructure }>("/api/market/structure");
  return response.structure;
};

export const getMarketAssets = async (limit = 12) => {
  const response = await apiGet<{ ok: true; assets: ApiMarketAsset[] }>(`/api/market/assets?limit=${limit}`);
  return response.assets;
};

export const getSignals = async (limit = 500) => {
  const response = await apiGet<{ ok: true; signals: ApiSignal[] }>(`/api/signals?limit=${limit}`);
  return Array.isArray(response.signals) ? response.signals : [];
};

export const getSignal = async (id: string) => {
  const response = await apiGet<{ ok: true; signal: ApiSignal }>(`/api/signals/${encodeURIComponent(id)}`);
  return response.signal;
};

export const getDashboardSummary = async () => {
  const response = await apiGet<{ ok: true; summary: ApiDashboardSummary }>("/api/dashboard/summary");
  return response.summary;
};

export const getDashboardMetrics = async () => {
  const response = await apiGet<{ ok: true; metrics: ApiMetric[] }>("/api/dashboard/metrics");
  return Array.isArray(response.metrics) ? response.metrics : [];
};

export const getNews = async () => {
  const response = await apiGet<ApiListResponse<ApiNewsItem>>("/api/news");
  return response.items;
};

export const getNewsArticle = async (slug: string) => {
  const response = await apiGet<{ ok: true; item: ApiNewsItem }>(`/api/news/${encodeURIComponent(slug)}`);
  return response.item;
};

export const getLearn = async () => {
  const response = await apiGet<ApiListResponse<ApiContentItem>>("/api/learn");
  return response.items;
};

export const getLearnArticle = async (slug: string) => {
  const response = await apiGet<{ ok: true; item: ApiContentItem }>(`/api/learn/${encodeURIComponent(slug)}`);
  return response.item;
};

export const getDocs = async () => {
  const response = await apiGet<ApiListResponse<ApiContentItem>>("/api/docs");
  return response.items;
};

export const getDocArticle = async (slug: string) => {
  const response = await apiGet<{ ok: true; item: ApiContentItem }>(`/api/docs/${encodeURIComponent(slug)}`);
  return response.item;
};

export const calculateRisk = async (payload: { entry: number; stop: number; target: number }) => {
  const response = await apiPost<{ ok: true; result: unknown }>("/api/tools/risk", payload);
  return response.result;
};

export const calculatePositionSize = async (payload: {
  accountSize: number;
  riskPercent: number;
  entry: number;
  stop: number;
}) => {
  const response = await apiPost<{ ok: true; result: unknown }>("/api/tools/position-size", payload);
  return response.result;
};

export const calculateRiskReward = async (payload: { reward: number; risk: number }) => {
  const response = await apiPost<{ ok: true; result: unknown }>("/api/tools/rr", payload);
  return response.result;
};
