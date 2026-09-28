import { Component } from "react";
import Icon from "./Icon.jsx";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("CampusCoin caught an unhandled UI error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-card bg-white p-6 text-center shadow-card">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <Icon name="triangle-alert" size={22} />
          </span>
          <h1 className="font-display text-lg font-bold text-ink-900">Something broke on this page</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Your data is safe. Reload to try again, or head back to your dashboard.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Try again
            </button>
            {this.props.showReload ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Reload page
              </button>
            ) : null}
            <a
              href="/dashboard"
              className="rounded-lg border border-slate-200 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-slate-50"
            >
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
