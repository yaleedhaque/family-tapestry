"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error("Timeline route error:", error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tapestry-bg)] p-8">
      <div className="text-center max-w-md">
        <h2 className="font-display text-xl text-[var(--thread-gold)] mb-2">Something went wrong</h2>
        <p className="text-sm text-[var(--parchment-dim)] mb-6">
          An error occurred loading this page. Your data is safe — try refreshing.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
