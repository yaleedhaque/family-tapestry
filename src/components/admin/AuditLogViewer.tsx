"use client";

import { useState, useEffect } from "react";

interface AuditEntry {
  id: string;
  person_id: string;
  editor_id: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  edited_at: string;
  persons?: { full_name: string };
  editor?: { email: string };
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch("/api/audit");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-parchment-dim font-body text-sm">
        Loading audit log...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-4 text-parchment-dim font-body text-sm">
        No edits recorded yet.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="font-display text-xl text-parchment mb-4">Audit Log</h2>
      <div className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 rounded-md border border-thread-gold-dim/20 bg-tapestry-bg-alt"
          >
            <span className="font-body text-xs text-thread-gold-dim whitespace-nowrap">
              {new Date(log.edited_at).toLocaleString()}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-body text-sm text-parchment">
                {log.editor?.email ?? "Unknown"}
              </span>
              <span className="font-body text-sm text-parchment-dim">
                {" "}edited{" "}
              </span>
              <span className="font-body text-sm text-parchment">
                {log.persons?.full_name ?? "Unknown"}
              </span>
              <span className="font-body text-sm text-parchment-dim">
                {" "}&mdash; {log.field}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
