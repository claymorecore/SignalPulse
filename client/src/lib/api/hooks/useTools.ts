import { useMemo, useState } from "react";
import {
  calculatePositionSize,
  calculateRisk,
  calculateRiskReward
} from "../endpoints";

export default function useTools() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wrap = <T,>(fn: () => Promise<T>) => async () => {
    setPending(true);
    setError(null);

    try {
      return await fn();
    } catch (incomingError) {
      const resolvedError =
        incomingError instanceof Error ? incomingError : new Error(String(incomingError));
      setError(resolvedError);
      throw resolvedError;
    } finally {
      setPending(false);
    }
  };

  return useMemo(
    () => ({
      pending,
      error,
      calculateRisk: (payload: Parameters<typeof calculateRisk>[0]) => wrap(() => calculateRisk(payload))(),
      calculatePositionSize: (payload: Parameters<typeof calculatePositionSize>[0]) =>
        wrap(() => calculatePositionSize(payload))(),
      calculateRiskReward: (payload: Parameters<typeof calculateRiskReward>[0]) =>
        wrap(() => calculateRiskReward(payload))(),
    }),
    [error, pending]
  );
}
