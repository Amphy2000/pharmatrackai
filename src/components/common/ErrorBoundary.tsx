import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorId: string;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorId: "",
  };

  static getDerivedStateFromError() {
    const id =
      (globalThis.crypto as any)?.randomUUID?.() ??
      `err_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return { hasError: true, errorId: id };
  }

  componentDidCatch(error: unknown) {
    console.error("UI error boundary caught:", error);
    toast.error("Something went wrong", {
      description: "A screen crashed unexpectedly. Please refresh and try again.",
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold">This page crashed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your data is safe. Refresh the page to continue.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Error ID: <span className="font-mono">{this.state.errorId}</span>
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={this.handleReload} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
