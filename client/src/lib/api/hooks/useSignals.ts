import type { ApiSignal } from "../../../types/api";
import { getSignals } from "../endpoints";
import useApiResource from "./useApiResource";

export default function useSignals(limit = 500) {
  return useApiResource<ApiSignal[]>(
    "useSignals",
    () => getSignals(limit),
    { initialData: [] }
  );
}
