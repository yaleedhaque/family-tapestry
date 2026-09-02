"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useLang } from "@/lib/i18n";

// Compact "cluster" card shown in place of a collapsed sub-tree. Clicking it
// expands that union's hidden descendants. It has a top input handle so the
// collapsed union's diamond has a single straight drop into it, and it renders
// in the union's child generation row (the layout treats it as a child node).
function CollapsedNode({ data }: NodeProps) {
  const { t } = useLang();
  const count = (data.count as number) ?? 0;
  const names = (data.names as string[] | undefined) ?? [];
  const label = data.label as string | undefined;
  const highlighted = data.highlighted === true;
  const dimmed = data.dimmed === true;
  const unionId = data.unionId as string | undefined;
  const onExpand = (data.onExpand as ((id: string) => void) | undefined) ?? (() => {});

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unionId) onExpand(unionId);
  };

  return (
    <button
      type="button"
      role="group"
      aria-label={label}
      data-testid="collapsed-node"
      title={label}
      onClick={handleExpand}
      onMouseDown={(e) => e.stopPropagation()}
      className={`
        relative flex flex-col items-center gap-1 rounded-lg
        border border-dashed border-[var(--thread-gold)]/70 bg-[var(--tapestry-bg-alt)]/90
        px-4 py-3 w-[150px] text-left
        cursor-pointer transition-all duration-200 hover:border-[var(--thread-gold)] hover:shadow-[0_0_18px_rgba(201,162,75,0.25)]
        ${highlighted ? "ring-2 ring-[var(--thread-gold)] ring-offset-2 ring-offset-[var(--tapestry-bg)] scale-105" : ""}
        ${dimmed ? "opacity-35" : ""}
      `}
    >
      <Handle type="target" id="top" position={Position.Top} className="!bg-thread-gold !w-2 !h-2" />

      {/* cluster badge */}
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--thread-gold)]/15 border border-[var(--thread-gold)]/50 text-[var(--thread-gold)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <circle cx="9" cy="8" r="2.2" />
          <circle cx="17" cy="9" r="2" />
          <circle cx="8" cy="17" r="2.2" />
          <path d="M10.5 9.5 13 9M15.4 10.6 14.5 14M10.5 15.5l3-.8" strokeLinecap="round" />
        </svg>
      </div>

      <span className="font-display text-sm font-semibold text-[var(--thread-gold)] leading-tight">
        {count} {count === 1 ? t("collapse.person") : t("collapse.people")}
      </span>

      <span className="font-body text-[9px] text-[var(--parchment-dim)] text-center">
        {t("collapse.hidden")}
      </span>

      {names.length > 0 && (
        <span className="font-body text-[9px] text-[var(--parchment-dim)] leading-tight text-center truncate w-full opacity-80">
          {names.join(", ")}
        </span>
      )}

      <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-body text-[var(--thread-gold)] uppercase tracking-wider">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        {t("collapse.expandLabel")}
      </span>
    </button>
  );
}

export default memo(CollapsedNode);
