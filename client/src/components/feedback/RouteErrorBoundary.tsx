import { Component, type ErrorInfo, type ReactNode } from "react";
import ErrorFallback from "./ErrorFallback";
import { logger } from "../../lib/logger";

type RouteErrorBoundaryProps = {
  routeName: string;
  children: ReactNode;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
};

export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Route render failed", {
      source: "RouteErrorBoundary",
      routeName: this.props.routeName,
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          title={`${this.props.routeName} is temporarily unavailable`}
          description="The route failed safely instead of crashing the entire application."
          actionLabel="Retry route"
          onAction={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
