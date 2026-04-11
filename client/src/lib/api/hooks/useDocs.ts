import type { ApiContentItem } from "../../../types/api";
import { getDocs } from "../endpoints";
import useApiResource from "./useApiResource";

export default function useDocs() {
  return useApiResource<ApiContentItem[]>(
    "useDocs",
    getDocs,
    { initialData: [] }
  );
}
