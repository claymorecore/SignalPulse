import type { ApiContentItem } from "../../../types/api";
import { getLearn } from "../endpoints";
import useApiResource from "./useApiResource";

export default function useLearn() {
  return useApiResource<ApiContentItem[]>(
    "useLearn",
    getLearn,
    { initialData: [] }
  );
}
