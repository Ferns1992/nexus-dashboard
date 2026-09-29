import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[nexus] render error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            The dashboard hit an unexpected error. Reloading usually clears it.
          </p>
          <pre className="text-left text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 overflow-x-auto text-red-600 dark:text-red-400">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reload
          </button>
        </div>
      </div>
    );
  }
}
