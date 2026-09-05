"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { safePath } from "@/lib/safe-path";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();
  const redirect = safePath(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSupabase, setHasSupabase] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });

    if (authError) {
      setError(authError.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-2xl text-[var(--thread-gold)]">Family Tapestry</Link>
          <p className="text-sm text-[var(--parchment-dim)] mt-2">
            {isSignUp ? t("auth.taglineSignUp") : t("auth.taglineSignIn")}
          </p>
        </div>

        <div className="bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/40 rounded-xl p-6 shadow-[var(--shadow-xl)]">
          {!hasSupabase && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--thread-gold)]/10 border border-[var(--thread-gold)]/20">
              <p className="text-xs text-[var(--thread-gold)]">
                {t("auth.noSupabase")}
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
              <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                required
                className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2.5 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)]">{t("auth.password")}</label>
                <Link href="/auth/reset" className="text-[10px] text-[var(--thread-gold-dim)] hover:text-[var(--thread-gold)] transition-colors">
                  {t("auth.forgot")}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  required
                  className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2.5 pr-10 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t("auth.hide") : t("auth.show")}
                  aria-pressed={showPassword}
                  title={showPassword ? t("auth.hide") : t("auth.show")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-[var(--thread-gold-dim)] hover:text-[var(--thread-gold)] hover:bg-white/5 transition-colors"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-[18px] h-[18px]">
                      <path d="M3 3l18 18" strokeLinecap="round" />
                      <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4 10 7a15.7 15.7 0 0 1-2.6 3.4" strokeLinecap="round" />
                      <path d="M6.6 6.6A14 14 0 0 0 2 12c1 3 5 7 10 7a9.8 9.8 0 0 0 4-.9" strokeLinecap="round" />
                      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-[18px] h-[18px]">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? t("auth.loading") : isSignUp ? t("auth.create") : t("auth.signIn")}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-xs text-[var(--thread-gold-dim)] hover:text-[var(--thread-gold)] transition-colors"
            >
              {isSignUp ? t("auth.switchToSignIn") : t("auth.switchToSignUp")}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--thread-gold-dim)]/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--tapestry-bg-alt)] px-3 text-[var(--parchment-dim)]">{t("auth.or")}</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg bg-[#FFFFFF] border-[1.5px] border-[rgba(0,0,0,0.08)] text-[#1F1F1F] font-body text-[15px] font-semibold hover:bg-[#F8F8F8] transition-colors disabled:opacity-50"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {googleLoading ? (
              t("auth.googleLoading")
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t("auth.google")}
              </>
            )}
          </button>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-xs text-[var(--link)] hover:text-[var(--parchment)] transition-colors">
            {t("auth.browseDemo")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--tapestry-bg)] flex items-center justify-center"><p className="text-[var(--parchment-dim)]">Loading...</p></div>}>      <LoginForm />
    </Suspense>
  );
}
