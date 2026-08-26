"use client";

import { useState } from "react";

export default function HelpModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"guide" | "shortcuts" | "about">("guide");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body"
        title="Help & About"
      >
        ℹ
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[70]" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
        <div className="bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/30 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,0.7)]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--thread-gold-dim)]/20">
            <h2 className="font-display text-lg text-[var(--thread-gold)]">Help & About</h2>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 px-6 py-2 border-b border-[var(--thread-gold-dim)]/15">
            {([
              { key: "guide" as const, label: "User Guide" },
              { key: "shortcuts" as const, label: "Shortcuts" },
              { key: "about" as const, label: "About" },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded text-xs font-body transition-colors ${
                  tab === t.key
                    ? "bg-[var(--thread-gold)] text-[var(--tapestry-bg)]"
                    : "text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm text-[var(--parchment)] font-body">
            {tab === "guide" && (
              <>
                <Section title="What is Family Tapestry?">
                  <p>Family Tapestry is a collaborative, interactive family tree application. You and your family members can build a shared digital chronicle — adding people, relationships, photos, life events, and stories — all in a beautiful, living graph.</p>
                </Section>

                <Section title="Getting Started">
                  <ol className="list-decimal list-inside space-y-2">
                    <li><strong>View the tree</strong> — The home page shows your family tree. Pan by dragging, zoom with scroll.</li>
                    <li><strong>Click any person</strong> — A side panel opens with their full profile, relationships, and sources.</li>
                    <li><strong>Sign up</strong> — Create an account to start editing. Your account needs admin approval before you can make changes.</li>
                    <li><strong>Add people</strong> — Use the <Gold>+ button</Gold> (bottom-right) to add a new person, or add partners/children/parents from an existing person&apos;s profile.</li>
                    <li><strong>Edit profiles</strong> — Open any person, click &quot;Edit Profile&quot; to update their details, biography, and contact info.</li>
                  </ol>
                </Section>

                <Section title="Tree Canvas">
                  <ul className="list-disc list-inside space-y-1.5">
                    <li><Gold>Drag</Gold> to pan the canvas</li>
                    <li><Gold>Scroll</Gold> to zoom in/out</li>
                    <li><Gold>Click a person node</Gold> to open their profile panel</li>
                    <li><Gold>Hover</Gold> a person to highlight their connected family (parents, partners, children)</li>
                    <li><Gold>Minimap</Gold> (bottom-right) shows your position in the full tree</li>
                    <li><Gold>Controls</Gold> (bottom-right) for zoom in/out/fit</li>
                  </ul>
                </Section>

                <Section title="Navigation Bar (Bottom)">
                  <ul className="list-disc list-inside space-y-1.5">
                    <li><Gold>Tree</Gold> — Main family tree canvas (home page)</li>
                    <li><Gold>Timeline</Gold> — Chronological view of all life events across the family</li>
                    <li><Gold>Map</Gold> — Geographic map showing where family members live/lived</li>
                    <li><Gold>Import</Gold> — Import a GEDCOM file (standard genealogy format) to load an existing family tree</li>
                    <li><Gold>?</Gold> — Keyboard shortcuts reference</li>
                    <li><Gold>☀ / ☾</Gold> — Toggle dark/light theme</li>
                    <li><Gold>ℹ</Gold> — This help & about modal</li>
                    <li><Gold>Sign In / Sign Out</Gold> — Account management</li>
                  </ul>
                </Section>

                <Section title="Info Panel (Person Profile)">
                  <ul className="list-disc list-inside space-y-1.5">
                    <li><Gold>Profile tab</Gold> — View/edit full name, birth/death years, birth place, profession, biography, and contact info (email, phone, address, website)</li>
                    <li><Gold>Photo upload</Gold> — Add or change a person&apos;s portrait photo (visible on the tree node and profile)</li>
                    <li><Gold>Parents tab</Gold> — View, add, or remove parent relationships</li>
                    <li><Gold>Partners tab</Gold> — View, add, or remove partner relationships (marriage, partnership, divorced)</li>
                    <li><Gold>Children tab</Gold> — View, add, or remove child relationships</li>
                    <li><Gold>Sources tab</Gold> — Cite sources (birth certificates, documents, photos, etc.) for a person&apos;s information</li>
                    <li><Gold>Delete</Gold> — Remove a person from the tree (with confirmation)</li>
                  </ul>
                </Section>

                <Section title="Timeline Page">
                  <p>Shows all life events (births, marriages, careers, achievements, deaths) in chronological order, grouped by year. Each event shows the person&apos;s name, event type icon, location, and any notes.</p>
                </Section>

                <Section title="Map Page">
                  <p>Shows all family members with known locations on an interactive map. Colored markers indicate which generation they belong to. Lines connect partners and parent-child relationships across locations.</p>
                </Section>

                <Section title="GEDCOM Import/Export">
                  <p>GEDCOM is the standard format for genealogy data. You can:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><Gold>Export</Gold> — Download your tree as a .ged file (use the toolbar)</li>
                    <li><Gold>Import</Gold> — Upload a .ged file from other genealogy software (Ancestry, FamilySearch, etc.)</li>
                  </ul>
                </Section>

                <Section title="Multi-Tree Support">
                  <p>Create and switch between multiple family trees (e.g., maternal side, paternal side, different families). Use the tree selector dropdown in the top-left corner.</p>
                </Section>

                <Section title="Reporting Bugs or Problems">
                  <p>If you encounter any issues:</p>
                  <ol className="list-decimal list-inside space-y-2 mt-2">
                    <li>Try refreshing the page (<kbd className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 border border-white/10 font-mono">F5</kbd> or <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 border border-white/10 font-mono">Ctrl+R</kbd>)</li>
                    <li>Try signing out and signing back in</li>
                    <li>Check your internet connection</li>
                    <li>Try a different browser (Chrome, Firefox, Edge, Safari)</li>
                    <li>Clear your browser cache and cookies for this site</li>
                  </ol>
                  <p className="mt-3">If the problem persists, contact the administrator:</p>
                  <a
                    href="mailto:yaleedhaque@gmail.com?subject=Family%20Tapestry%20Bug%20Report&body=Describe%20the%20problem%3A%0A%0AWhat%20were%20you%20trying%20to%20do%3F%0AWhat%20happened%20instead%3F%0A%0APlease%20attach%20a%20screenshot%20if%20possible."
                    className="inline-block mt-2 px-4 py-2 text-xs rounded-lg bg-[var(--thread-gold)]/10 border border-[var(--thread-gold)]/30 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/20 transition-colors"
                  >
                    📧 Report a Bug via Email
                  </a>
                </Section>
              </>
            )}

            {tab === "shortcuts" && (
              <>
                <Section title="Keyboard Shortcuts">
                  <div className="space-y-2">
                    <ShortcutRow keys={["/"]} desc="Open search bar" />
                    <ShortcutRow keys={["Esc"]} desc="Close panel, deselect person, close modals" />
                    <ShortcutRow keys={["?"]} desc="Toggle this help modal" />
                    <ShortcutRow keys={["Click"]} desc="Select a person on the tree" />
                    <ShortcutRow keys={["Hover"]} desc="Highlight connected family members" />
                    <ShortcutRow keys={["Scroll"]} desc="Zoom in/out on tree canvas" />
                    <ShortcutRow keys={["Drag"]} desc="Pan the tree canvas" />
                    <ShortcutRow keys={["Ctrl", "Scroll"]} desc="Zoom (trackpad gesture)" />
                  </div>
                </Section>

                <Section title="Mouse / Touch">
                  <div className="space-y-2">
                    <ShortcutRow keys={["Left Click + Drag"]} desc="Pan the canvas" />
                    <ShortcutRow keys={["Scroll Wheel"]} desc="Zoom in/out" />
                    <ShortcutRow keys={["Click Node"]} desc="Open person info panel" />
                    <ShortcutRow keys={["Click Background"]} desc="Deselect / close panel" />
                    <ShortcutRow keys={["Pinch"]} desc="Zoom on mobile/tablet" />
                    <ShortcutRow keys={["Touch + Drag"]} desc="Pan on mobile/tablet" />
                  </div>
                </Section>
              </>
            )}

            {tab === "about" && (
              <>
                <Section title="Digital Family Tapestry">
                  <p>A collaborative family tree application built with love to help families preserve and share their heritage across generations.</p>
                </Section>

                <Section title="Developed By">
                  <div className="space-y-2">
                    <p><strong>Md. Yaleed Haque</strong></p>
                    <p className="text-[var(--parchment-dim)] text-xs">Full-Stack Developer &bull; 2026</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <a href="https://github.com/yaleedhaque" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] hover:border-[var(--thread-gold)]/30 transition-colors">
                        GitHub
                      </a>
                      <a href="mailto:yaleedhaque@gmail.com" className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] hover:border-[var(--thread-gold)]/30 transition-colors">
                        Email
                      </a>
                    </div>
                  </div>
                </Section>

                <Section title="Technology Stack">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <TechItem label="Frontend" value="Next.js 14 + React 18 + TypeScript" />
                    <TechItem label="Styling" value="Tailwind CSS" />
                    <TechItem label="Graph Engine" value="React Flow + ELK.js" />
                    <TechItem label="Maps" value="Leaflet / OpenStreetMap" />
                    <TechItem label="Backend" value="Supabase (PostgreSQL + Auth + Storage)" />
                    <TechItem label="Hosting" value="Vercel" />
                    <TechItem label="Genealogy" value="GEDCOM 5.5.1 Standard" />
                    <TechItem label="Image Processing" value="Sharp" />
                  </div>
                </Section>

                <Section title="Privacy & Data">
                  <ul className="list-disc list-inside space-y-1.5 text-[var(--parchment-dim)] text-xs">
                    <li>All data is stored securely in Supabase (encrypted at rest)</li>
                    <li>Only approved family members can edit the tree</li>
                    <li>Photos are stored in Supabase Storage with access controls</li>
                    <li>No data is shared with third parties</li>
                    <li>You can export all your data at any time via GEDCOM</li>
                    <li>Account deletion removes your access; contact admin to delete data</li>
                  </ul>
                  <a href="/privacy" className="inline-block mt-3 px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] hover:border-[var(--thread-gold)]/30 transition-colors">
                    Read full Privacy Policy →
                  </a>
                </Section>

                <Section title="Version">
                  <p className="text-[var(--parchment-dim)] text-xs">Family Tapestry v0.2.0 &mdash; August 2026</p>
                </Section>

                <Section title="Open Source Credits">
                  <p className="text-[var(--parchment-dim)] text-xs">
                    Built with open source technologies. Special thanks to the React Flow, Supabase, Next.js, Tailwind CSS, and Leaflet communities.
                  </p>
                </Section>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-sm text-[var(--thread-gold)] mb-2">{title}</h3>
      <div className="text-[var(--parchment-dim)] text-xs leading-relaxed">{children}</div>
    </div>
  );
}

function Gold({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--thread-gold)] font-medium">{children}</span>;
}

function ShortcutRow({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i}>
            <kbd className="px-2 py-1 text-[10px] rounded bg-white/10 border border-white/10 font-mono text-[var(--parchment)] min-w-[28px] text-center inline-block">
              {k}
            </kbd>
            {i < keys.length - 1 && <span className="text-[var(--parchment-dim)] mx-0.5 text-[10px]">+</span>}
          </span>
        ))}
      </div>
      <span className="text-[11px] text-[var(--parchment-dim)]">{desc}</span>
    </div>
  );
}

function TechItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] rounded-lg px-3 py-2 border border-[var(--thread-gold-dim)]/10">
      <span className="text-[var(--thread-gold-dim)]">{label}: </span>
      <span className="text-[var(--parchment)]">{value}</span>
    </div>
  );
}
