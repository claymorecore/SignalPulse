import { useCallback, useEffect, useState } from "react";
import useErrorTracking from "../../../hooks/useErrorTracking";

type UseApiResourceOptions<T> = {
  initialData: T;
  enabled?: boolean;
};

export type ApiResourceState<T> = {
  data: T;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export default function useApiResource<T>(
  source: string,
  fetcher: () => Promise<T>,
  options: UseApiResourceOptions<T>
): ApiResourceState<T> {
  const captureError = useErrorTracking();
  const [data, setData] = useState<T>(options.initialData);
  const [isLoading, setIsLoading] = useState<boolean>(options.enabled !== false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (options.enabled === false) return;

    setIsLoading(true);

    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (incomingError) {
      const resolvedError =
        incomingError instanceof Error ? incomingError : new Error(String(incomingError));
      setError(resolvedError);
      captureError(resolvedError, { source });
    } finally {
      setIsLoading(false);
    }
  }, [captureError, fetcher, options.enabled, source]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
