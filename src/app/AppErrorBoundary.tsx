import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  public override state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("DreamCraft boundary captured an application error", {
      name: error.name,
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="fatal-surface" role="alert">
          <p className="eyebrow">The dream would not hold its shape.</p>
          <h1>A stable return path remains.</h1>
          <p>
            Reload the local shell. No account or API key is required for the
            deterministic preview.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload DreamCraft
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
