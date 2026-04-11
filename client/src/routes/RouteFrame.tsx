import { Suspense, type ReactNode } from "react";
import LoadingState from "../components/feedback/LoadingState";
import RouteErrorBoundary from "../components/feedback/RouteErrorBoundary";

type RouteFrameProps = {
  routeName: string;
  children: ReactNode;
};

export default function RouteFrame({ routeName, children }: RouteFrameProps) {
  return (
    <RouteErrorBoundary routeName={routeName}>
      <Suspense
        fallback={
          <LoadingState
            title={`Loading ${routeName}`}
            description="SignalPulse is preparing the next route."
          />
        }
      >
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}
