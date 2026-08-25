"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSupabase, setHasSupabase] = useState(true);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setHasSupabase(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!hasSupabase) {
      router.replace(redirect);
      return;
    }

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + redirect } })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      router.replace(redirect);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-2xl text-[var(--thread-gold)]">Family Tapestry</Link>
          <p className="text-sm text-[var(--parchment-dim)] mt-2">
            {isSignUp ? "Create an account to collaborate" : "Sign in to your tree"}
          </p>
        </div>

        <div className="bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/20 rounded-xl p-6 shadow-2xl">
          {!hasSupabase && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--thread-gold)]/10 border border-[var(--thread-gold)]/20">
              <p className="text-xs text-[var(--thread-gold)]">
                No Supabase configured. Click sign in to continue without auth.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--ember-red)]/10 border border-[var(--ember-red)]/20">
              <p className="text-xs text-[var(--ember-red)]">{error}</p>
            </div>
          )}

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

            <div>
              <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2.5 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-xs text-[var(--thread-gold-dim)] hover:text-[var(--thread-gold)] transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-xs text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">
            â† Continue without signing in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--tapestry-bg)] flex items-center justify-center"><p className="text-[var(--parchment-dim)]">Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
