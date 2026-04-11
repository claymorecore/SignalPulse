import { Component, type ErrorInfo, type ReactNode } from "react";
import ErrorFallback from "./ErrorFallback";
import { logger } from "../../lib/logger";

type ComponentErrorBoundaryProps = {
  name: string;
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
};

type ComponentErrorBoundaryState = {
  hasError: boolean;
};

export default class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  state: ComponentErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Component render failed", {
      source: "ComponentErrorBoundary",
      name: this.props.name,
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          title={this.props.fallbackTitle ?? `${this.props.name} could not be rendered`}
          description={
            this.props.fallbackDescription ??
            "SignalPulse replaced this component with a safe fallback."
          }
        />
      );
    }

    return this.props.children;
  }
}
