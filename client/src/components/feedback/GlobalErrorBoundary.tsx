import { Component, type ErrorInfo, type ReactNode } from "react";
import ErrorFallback from "./ErrorFallback";
import { logger } from "../../lib/logger";

type GlobalErrorBoundaryProps = {
  children: ReactNode;
};

type GlobalErrorBoundaryState = {
  hasError: boolean;
};

export default class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Global application error", {
      source: "GlobalErrorBoundary",
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <div className="app-background" aria-hidden="true" />
          <main className="app-main app-main--error">
            <div className="page-container">
              <ErrorFallback
                title="SignalPulse hit a critical application error"
                description="The app recovered into a safe state. Reloading usually restores the current session."
                actionLabel="Reload app"
                onAction={this.handleReload}
              />
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
