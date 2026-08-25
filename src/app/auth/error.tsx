"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error("Auth route error:", error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tapestry-bg)] p-8">
      <div className="text-center max-w-md">
        <h2 className="font-display text-xl text-[var(--thread-gold)] mb-2">Sign-in unavailable</h2>
        <p className="text-sm text-[var(--parchment-dim)] mb-6">
          The authentication system is not configured yet. Contact the administrator.
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="inline-block px-4 py-2 text-sm rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity"
          >
            Back to tree
          </a>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--thread-gold)]/30 text-[var(--thread-gold)] font-body hover:bg-[var(--thread-gold)]/10 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
