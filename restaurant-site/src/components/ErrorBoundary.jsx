import { Component } from "react";
import { Link } from "react-router-dom";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Unhandled UI error", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-cream">
          <h1 className="font-serif text-3xl font-semibold text-dark mb-2">Something went wrong</h1>
          <p className="text-dark/50 max-w-md mb-6">
            {this.state.error.message ??
              "This page could not be displayed. Try reloading, or come back later."}
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-dark text-cream text-sm font-semibold rounded-sm hover:bg-dark-light transition-colors"
            >
              Reload page
            </button>
            <Link
              to="/"
              className="px-6 py-3 text-sm font-semibold text-dark underline underline-offset-4"
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
