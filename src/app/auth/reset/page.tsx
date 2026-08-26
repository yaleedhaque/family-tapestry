"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/update-password",
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-2xl text-[var(--thread-gold)]">Family Tapestry</Link>
          <p className="text-sm text-[var(--parchment-dim)] mt-2">
            {sent ? "Check your email" : "Reset your password"}
          </p>
        </div>

        <div className="bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/20 rounded-xl p-6 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--ember-red)]/10 border border-[var(--ember-red)]/20">
              <p className="text-xs text-[var(--ember-red)]">{error}</p>
            </div>
          )}

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[var(--thread-gold)]/10 border border-[var(--thread-gold)]/20 flex items-center justify-center mx-auto">
                <span className="text-xl">✉</span>
              </div>
              <p className="text-sm text-[var(--parchment-dim)]">
                We sent a password reset link to <strong className="text-[var(--parchment)]">{email}</strong>.
                Check your inbox and follow the link to reset your password.
              </p>
              <p className="text-xs text-[var(--parchment-dim)]/60">
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-xs text-[var(--thread-gold-dim)] hover:text-[var(--thread-gold)] transition-colors"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2.5 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6">
          <Link href="/auth/login" className="text-xs text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
