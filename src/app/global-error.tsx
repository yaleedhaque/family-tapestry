"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0E0B0A", color: "#EFE6D8", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.5rem", marginBottom: "0.5rem", color: "#C9A24B" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#B8AC98", marginBottom: "1.5rem" }}>
              The tapestry encountered an unexpected error. Your data is safe.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "0.5rem 1.5rem",
                borderRadius: "0.5rem",
                background: "#C9A24B",
                color: "#0E0B0A",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
