import React from "react";
import * as Sentry from "@sentry/react";
import opeddLogoColor from "@/assets/opedd-logo.png";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-alice-gray flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="mb-8 flex justify-center">
              <img src={opeddLogoColor} alt="Opedd" className="h-10" />
            </div>
            <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-navy-deep/5">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <span className="text-2xl">!</span>
              </div>
              <h2 className="text-xl font-bold text-navy-deep mb-2">
                Something went wrong
              </h2>
              <p className="text-navy-deep/60 text-sm mb-6">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full h-12 bg-gradient-to-r from-oxford to-violet-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-oxford/30 transition-all active:scale-[0.98]"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
