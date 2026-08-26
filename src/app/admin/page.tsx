"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

interface UserProfile {
  id: string;
  display_name: string;
  role: string;
  approved: boolean;
  email: string;
  signup_date: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  totalPersons: number;
}

export default function AdminPage() {
  const { loading: authLoading, canAdmin } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to load users");
      }
      const data = await res.json();
      setProfiles(data.profiles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const treeRes = await fetch("/api/tree");
      if (treeRes.ok) {
        const tree = await treeRes.json();
        setStats({
          totalUsers: profiles.length,
          pendingUsers: profiles.filter((p) => !p.approved).length,
          totalPersons: tree.persons?.length ?? 0,
        });
      }
    } catch { /* ignore */ }
  }, [profiles]);

  useEffect(() => {
    if (!authLoading && !canAdmin) {
      router.replace("/");
    }
  }, [authLoading, canAdmin, router]);

  useEffect(() => {
    if (canAdmin) {
      fetchUsers().finally(() => setLoading(false));
    }
  }, [canAdmin, fetchUsers]);

  useEffect(() => {
    if (profiles.length > 0) fetchStats();
  }, [profiles, fetchStats]);

  const handleApprove = async (userId: string, approved: boolean) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, approved }),
    });
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    fetchUsers();
  };

  if (authLoading || !canAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tapestry-bg)]">
        <p className="text-[var(--parchment-dim)] font-body text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] px-4 py-8 max-md:px-3">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between max-md:flex-col max-md:gap-3">
          <h1 className="font-display text-3xl text-[var(--thread-gold)] max-md:text-2xl">Admin Dashboard</h1>
          <a href="/" className="text-xs font-body text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">
            Back to Tree
          </a>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <div className="rounded-lg border border-[var(--thread-gold-dim)]/30 bg-[var(--tapestry-bg-alt)] p-4 text-center">
              <p className="text-2xl font-display text-[var(--thread-gold)]">{stats.totalUsers}</p>
              <p className="text-xs font-body text-[var(--parchment-dim)]">Total Users</p>
            </div>
            <div className="rounded-lg border border-[var(--thread-gold-dim)]/30 bg-[var(--tapestry-bg-alt)] p-4 text-center">
              <p className="text-2xl font-display text-[var(--living-glow)]">{stats.pendingUsers}</p>
              <p className="text-xs font-body text-[var(--parchment-dim)]">Pending Approval</p>
            </div>
            <div className="rounded-lg border border-[var(--thread-gold-dim)]/30 bg-[var(--tapestry-bg-alt)] p-4 text-center">
              <p className="text-2xl font-display text-[var(--parchment)]">{stats.totalPersons}</p>
              <p className="text-xs font-body text-[var(--parchment-dim)]">Persons in Tree</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-[var(--ember-red)]/50 bg-[var(--ember-red)]/10 p-3 text-sm font-body text-[var(--ember-red)]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="font-display text-xl text-[var(--parchment)]">Users</h2>

          {loading ? (
            <p className="text-sm font-body text-[var(--parchment-dim)]">Loading users...</p>
          ) : profiles.length === 0 ? (
            <p className="text-sm font-body text-[var(--parchment-dim)]">No users found.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-lg border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${
                    p.approved
                      ? "border-[var(--thread-gold-dim)]/30 bg-[var(--tapestry-bg-alt)]"
                      : "border-[var(--ember-red)]/40 bg-[var(--ember-red)]/5"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-sm text-[var(--parchment)] truncate">
                        {p.display_name || "Unnamed"}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-body ${
                        p.role === "admin" ? "bg-[var(--thread-gold)]/20 text-[var(--thread-gold)]"
                        : p.role === "editor" ? "bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)]"
                        : "bg-white/10 text-[var(--parchment-dim)]"
                      }`}>
                        {p.role}
                      </span>
                      {!p.approved && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--ember-red)]/20 text-[var(--ember-red)] font-body">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-body text-[var(--parchment-dim)] truncate">{p.email}</p>
                    <p className="text-[10px] font-body text-[var(--parchment-dim)]/60">
                      Joined {new Date(p.signup_date ?? p.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!p.approved ? (
                      <button
                        onClick={() => handleApprove(p.id, true)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/30 transition-colors font-body"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApprove(p.id, false)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[var(--ember-red)]/20 text-[var(--ember-red)] hover:bg-[var(--ember-red)]/30 transition-colors font-body"
                      >
                        Revoke
                      </button>
                    )}
                    <select
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.id, e.target.value)}
                      className="px-2 py-1.5 text-xs rounded-lg bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 text-[var(--parchment)] font-body appearance-none cursor-pointer pr-5 focus:outline-none focus:border-[var(--thread-gold)]"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23C9A24B' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
