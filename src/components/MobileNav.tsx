"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  { href: "/", label: "Tree", icon: TreeIcon },
  { href: "/timeline", label: "Timeline", icon: ClockIcon },
  { href: "/map", label: "Map", icon: MapIcon },
];

interface MobileNavProps {
  hidden?: boolean;
}

export default function MobileNav({ hidden = false }: MobileNavProps) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const suppressScroll = useRef(false);
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  useEffect(() => {
    if (hidden) {
      suppressScroll.current = true;
      setVisible(false);
      return;
    }
    suppressScroll.current = false;
    setVisible(true);
    setLastScroll(window.scrollY);
  }, [hidden]);

  useEffect(() => {
    if (suppressScroll.current) return;
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < lastScroll || y < 100);
      setLastScroll(y);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScroll, hidden]);

  const navVisible = visible && !hidden;

  return (
    <nav
      aria-label="Mobile navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden transition-transform duration-300 ${
        navVisible ? "translate-y-0" : "translate-y-full"
      } ${hidden ? "pointer-events-none" : ""}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-2 mb-2 bg-[var(--tapestry-bg)]/90 backdrop-blur-lg border border-[var(--thread-gold-dim)]/30 rounded-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.4)] flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors min-w-[60px] ${
                active
                  ? "text-[var(--thread-gold)] bg-[var(--thread-gold)]/10"
                  : "text-[var(--parchment-dim)] hover:text-[var(--parchment)]"
              }`}
            >
              <item.icon active={active} />
              <span className="text-[10px] font-body">{item.label}</span>
            </Link>
          );
        })}

        {!authLoading && (
          user ? (
            <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px]">
              <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-[var(--thread-gold)]/15 text-[var(--thread-gold)] font-body uppercase">
                {user.role ?? "editor"}
              </span>
              <button
                onClick={async () => {
                  const { createClient } = await import("@/lib/supabase/client");
                  await createClient().auth.signOut();
                  window.location.reload();
                }}
                className="text-[10px] font-body text-[var(--parchment-dim)] hover:text-[var(--parchment)]"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl min-w-[60px] text-[var(--thread-gold)]"
              aria-label="Sign in"
            >
              <UserIcon />
              <span className="text-[10px] font-body">Sign In</span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}

function TreeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="w-5 h-5">
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <path d="M12 8v4M7 14l-1 2M17 14l1 2" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" />
    </svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="w-5 h-5">
      <path d="M3 7l6-3 6 3 6-3v14l-6 3-6-3-6 3V7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 4v14M15 7v14" strokeLinecap="round" />
    </svg>
  );
}
