import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0] px-4">
          <div className="w-full max-w-md text-center">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-[#C05A46]/10 flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 text-[#C05A46]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="font-heading text-3xl font-bold text-[#2C2A29] tracking-tight mb-2">
              Bir hata oluştu
            </h1>

            {/* Description */}
            <p className="text-[#5C5855] leading-relaxed mb-8">
              Beklenmedik bir sorunla karşılaştık. Lütfen sayfayı yenileyerek
              tekrar deneyin.
            </p>

            {/* Reload button */}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 bg-[#C05A46] hover:bg-[#A64A38] text-white font-semibold rounded-full px-8 py-3 text-base shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#C05A46]/40 focus:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
              </svg>
              Sayfayı Yenile
            </button>

            {/* Error details in dev */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-8 text-left bg-white rounded-xl border border-[#E5DFD3] p-4">
                <summary className="text-sm font-semibold text-[#8A8580] cursor-pointer">
                  Hata Detayları (Geliştirici)
                </summary>
                <pre className="mt-3 text-xs text-[#B93A32] whitespace-pre-wrap break-words overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
