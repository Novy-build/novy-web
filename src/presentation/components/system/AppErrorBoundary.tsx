import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
  /** Optional reporting seam for tests and a future observability service. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/** Last-resort render boundary so an unexpected component error never leaves a blank screen. */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, info);
      return;
    }
    console.error('[novy] unexpected render error:', error, info.componentStack);
  }

  private readonly retry = (): void => {
    this.setState({ hasError: false });
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-full items-center justify-center bg-canvas p-6">
        <section className="max-w-md rounded-panel border border-hairline bg-surface p-8 text-center shadow-sm">
          <div
            aria-hidden="true"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl text-brand-700"
          >
            !
          </div>
          <h1 className="mt-4 text-xl font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Novy hit an unexpected problem. Your locally saved projects are still safe.
          </p>
          <button
            className="mt-5 rounded-tile bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            onClick={this.retry}
            type="button"
          >
            Try again
          </button>
          <a
            className="ml-2 inline-flex rounded-tile border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
            href="/projects"
          >
            Back to projects
          </a>
        </section>
      </main>
    );
  }
}
