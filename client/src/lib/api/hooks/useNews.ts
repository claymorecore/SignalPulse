import type { ApiNewsItem } from "../../../types/api";
import { getNews } from "../endpoints";
import useApiResource from "./useApiResource";

export default function useNews() {
  return useApiResource<ApiNewsItem[]>(
    "useNews",
    getNews,
    { initialData: [] }
  );
}
