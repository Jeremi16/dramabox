import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          minHeight: "100vh",
          padding: "24px"
        }}>
          <div style={{ 
            maxWidth: "480px", 
            width: "100%",
            padding: "32px",
            borderRadius: "16px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-light)",
            textAlign: "center"
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 24px",
              borderRadius: "50%",
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px"
            }}>
              !
            </div>
            <h2 style={{
              margin: "0 0 12px 0",
              fontSize: "20px",
              fontWeight: "700",
              color: "var(--text-primary)"
            }}>
              Oops! Terjadi kesalahan
            </h2>
            <p style={{
              margin: "0 0 24px 0",
              color: "var(--text-secondary)",
              fontSize: "14px",
              lineHeight: "1.6"
            }}>
              {this.state.error?.message || "Terjadi kesalahan yang tidak terduga"}
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{ 
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background: "var(--accent-primary)",
                color: "white",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                fontFamily: "inherit"
              }}
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
