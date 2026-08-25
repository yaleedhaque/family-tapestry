"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { persons, unions, parentEdges } from "@/data/family";
import type { Person } from "@/data/family";

const GENERATION_COLORS: Record<number, string> = {
  0: "#C9A24B",
  1: "#3E6B5C",
  2: "#D98B3E",
  3: "#6B4C8B",
};

const GENERATIONS: Record<string, number> = {
  p1: 0, p2: 0, p3: 0,
  p4: 1, p5: 1, p6: 1, p7: 1, p8: 1,
  p9: 2, p10: 2, p11: 2, p12: 2,
};

function makeIcon(color: string, alive: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${alive ? color : "transparent"};
      border:3px solid ${color};
      ${alive ? "" : "opacity:0.5;"}
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 10px ${color}44;
    ">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${alive ? "#fff" : color}" stroke-width="2">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </div>`,
  });
}

function FitBounds({ persons: ps }: { persons: Person[] }) {
  const map = useMap();
  useMemo(() => {
    const coords = ps.filter((p) => p.lat && p.lng).map((p) => [p.lat!, p.lng!] as [number, number]);
    if (coords.length > 0) {
      map.fitBounds(coords, { padding: [40, 40] });
    }
  }, [ps, map]);
  return null;
}

export default function MapView() {
  const personsWithCoords = useMemo(
    () => persons.filter((p) => p.lat && p.lng),
    []
  );

  const migrationArcs = useMemo(() => {
    const arcs: { from: Person; to: Person; type: string }[] = [];
    for (const u of unions) {
      const a = persons.find((p) => p.id === u.partnerA);
      const b = persons.find((p) => p.id === u.partnerB);
      if (a?.lat && a.lng && b?.lat && b.lng && (a.lat !== b.lat || a.lng !== b.lng)) {
        arcs.push({ from: a, to: b, type: u.type });
      }
    }
    const seen = new Set<string>();
    for (const pe of parentEdges) {
      const union = unions.find((u) => u.id === pe.unionId);
      if (!union) continue;
      const child = persons.find((p) => p.id === pe.childId);
      const parent = persons.find((p) => p.id === union.partnerA || p.id === union.partnerB);
      if (child?.lat && child.lng && parent?.lat && parent.lng && (child.lat !== parent.lat || child.lng !== parent.lng)) {
        const key = `${parent.id}->${child.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          arcs.push({ from: parent, to: child, type: "parent-child" });
        }
      }
    }
    return arcs;
  }, []);

  const center: [number, number] = [55.5, -3.5];

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] text-[var(--parchment)]">
      <header className="sticky top-0 z-40 bg-[var(--tapestry-bg)]/90 backdrop-blur-md border-b border-[var(--thread-gold-dim)]/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-sm">
            Tree
          </Link>
          <Link href="/timeline" className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-sm">
            Timeline
          </Link>
          <span className="text-sm text-[var(--thread-gold)]">Map</span>
          <div className="flex-1" />
          <span className="text-xs text-[var(--parchment-dim)]">{personsWithCoords.length} locations</span>
        </div>
      </header>

      <div className="h-[calc(100vh-56px)]">
        <MapContainer center={center} zoom={6} className="h-full w-full" zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds persons={personsWithCoords} />

          {personsWithCoords.map((p) => {
            const gen = GENERATIONS[p.id] ?? 0;
            const color = GENERATION_COLORS[gen] ?? "#C9A24B";
            return (
              <Marker
                key={p.id}
                position={[p.lat!, p.lng!]}
                icon={makeIcon(color, p.isAlive)}
              >
                <Popup>
                  <div style={{ fontFamily: "Inter, sans-serif", minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.fullName}</div>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
                      {p.birthYear} – {p.deathYear ?? "present"}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>{p.birthPlace}</div>
                    {p.profession && <div style={{ fontSize: 11, color: "#999", fontStyle: "italic" }}>{p.profession}</div>}
                    <div style={{ fontSize: 10, marginTop: 4 }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 4, verticalAlign: "middle" }} />
                      Generation {gen + 1}
                    </div>
                    <Link href={`/person/${p.id}`} style={{ fontSize: 11, color: "#C9A24B", textDecoration: "underline", display: "inline-block", marginTop: 4 }}>
                      View Profile →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {migrationArcs.map((arc, i) => {
            const isParentChild = arc.type === "parent-child";
            const isDivorced = arc.type === "divorced";
            return (
              <Polyline
                key={i}
                positions={[[arc.from.lat!, arc.from.lng!], [arc.to.lat!, arc.to.lng!]]}
                pathOptions={{
                  color: isDivorced ? "#8B2E2E" : isParentChild ? "#C9A24B88" : "#C9A24B",
                  weight: isParentChild ? 1.5 : 2,
                  opacity: isParentChild ? 0.4 : 0.6,
                  dashArray: isDivorced ? "6 4" : isParentChild ? "4 4" : undefined,
                }}
              />
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
