import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app">
          <div className="overlay">
            <div className="overlay-card">
              <div className="overlay-eyebrow">Word Dusk</div>
              <h2 className="overlay-title">Something went wrong</h2>
              <p className="overlay-stats">Reload to keep playing. Your progress is saved.</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
