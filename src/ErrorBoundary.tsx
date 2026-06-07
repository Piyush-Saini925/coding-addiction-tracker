import { Component, ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  message: string;
};

class ErrorBoundary extends Component<Props, State> {
  state: State = { message: '' };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message || 'Unknown app error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render failed', error, info);
  }

  render() {
    if (this.state.message) {
      return (
        <main className="setup-screen">
          <section className="setup-card">
            <p className="eyebrow">App error</p>
            <h1>Coding Addiction Tracker</h1>
            <p>The app hit a runtime error instead of rendering normally.</p>
            <pre>{this.state.message}</pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
