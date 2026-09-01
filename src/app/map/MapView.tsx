"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import { computeGenerationMap, GENERATION_COLORS } from "@/lib/generation";
import { useLang } from "@/lib/i18n";

type GenMap = Record<string, number>;

/* Build a Google Maps URL that lets the user drive/direct to a pinned place
   straight from their current location. Works on phone (opens the Google Maps
   app) and on desktop (opens Maps in a new tab). If we have a searchable name
   or address for the person we prefer to drop the pin there, otherwise use the
   saved coordinates. */
function googleMapsUrl(p: PersonLike): string {
  const query = p.address?.trim() || p.birthPlace?.trim() || (p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : "");
  if (!query) return "";
  return (
    "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" +
    encodeURIComponent(query)
  );
}

function createPersonIcon(person: PersonLike, genMap: GenMap) {
  const gen = genMap[person.id] ?? 0;
  const color = GENERATION_COLORS[gen % GENERATION_COLORS.length] ?? "#C9A544";
  const alive = person.isAlive !== false;
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html:
      '<div style="width:28px;height:28px;border-radius:50%;background:'
      + (alive ? color : "transparent")
      + ";border:3px solid "
      + color
      + ";opacity:"
      + (alive ? 1 : 0.5)
      + ";display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px "
      + color
      + '44"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="'
      + (alive ? "#fff" : color)
      + '" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>',
  });
}

function FitBounds({ persons }: { persons: PersonLike[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || persons.length === 0) return;
    const pts = persons
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => [p.lat!, p.lng!] as [number, number]);
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [persons, map]);
  return null;
}

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) map.setView(center, 12);
  }, [map, center]);
  return null;
}

function GeocoderSearch({ onSearch, strings }: { onSearch: (q: string) => void; strings: { placeholder: string; go: string } }) {
  const [query, setQuery] = useState("");
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && query.trim()) onSearch(query.trim());
        }}
        placeholder={strings.placeholder}
        className="flex-1 min-w-0 rounded-full bg-[var(--tapestry-bg)]/85 border border-[var(--thread-gold-dim)]/30 px-4 py-2 text-xs text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)] focus:ring-2 focus:ring-[var(--focus-ring)]/40"
      />
      <button
        onClick={() => {
          if (query.trim()) onSearch(query.trim());
        }}
        className="px-3 py-1.5 text-xs rounded-full bg-[var(--thread-gold)]/20 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/30 transition-colors"
      >
        {strings.go}
      </button>
    </div>
  );
}

function toPersonLikeFromDb(p: Record<string, unknown>): PersonLike {
  return {
    id: p.id as string,
    fullName: (p.full_name ?? p.fullName ?? "") as string,
    birthYear: (p.birth_year ?? p.birthYear ?? null) as number | null,
    deathYear: (p.death_year ?? p.deathYear ?? null) as number | null,
    isAlive: (p.is_alive ?? p.isAlive ?? true) as boolean,
    bio: (p.bio ?? "") as string,
    birthPlace: (p.birth_place ?? p.birthPlace ?? "") as string,
    profession: (p.profession ?? "") as string,
    email: (p.email ?? "") as string,
    phone: (p.phone ?? "") as string,
    address: (p.address ?? "") as string,
    website: (p.website ?? "") as string,
    lat: (p.lat ?? p.latitude ?? null) as number | null,
    lng: (p.lng ?? p.longitude ?? null) as number | null,
    photoUrl: (p.photo_url ?? p.photoUrl ?? "") as string,
  };
}

export default function MapView() {
  const { user } = useAuth();
  const { t } = useLang();

  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);

  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [unions, setUnions] = useState<UnionLike[]>([]);
  const [edges, setEdges] = useState<EdgeLike[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tree", { cache: "no-store" });
        if (res.ok) {
          const db = await res.json();
          if (!cancelled) {
            setPersons((db.persons ?? []).map(toPersonLikeFromDb));
            setUnions((db.unions ?? []) as UnionLike[]);
            setEdges((db.edges ?? []) as EdgeLike[]);
          }
        }
      } catch {
        /* keep empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const genMap = useMemo(
    () => computeGenerationMap(persons, unions, edges),
    [persons, unions, edges]
  );

  /* Every person with coordinates gets a pin the moment the map loads. */
  const pinned = useMemo(
    () => persons.filter((p) => p.lat != null && p.lng != null),
    [persons]
  );

  const handleGeocodeSearch = useCallback(async (q: string) => {
    try {
      const res = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&q="
          + encodeURIComponent(q)
          + "&limit=1",
        { headers: { "User-Agent": "FamilyTapestry/1.0" } }
      );
      const results = await res.json();
      if (results[0]) {
        setSearchCenter([
          parseFloat(results[0].lat),
          parseFloat(results[0].lon),
        ]);
      }
    } catch {
      /* noop */
    }
  }, []);

  const strings = {
    tree: t("nav.tree"),
    timeline: t("nav.timeline"),
    map: t("nav.map"),
    loading: t("map.loading"),
    locations: (n: number) => t("map.locations", String(n)),
    searchPlaceholder: t("map.searchPlaceholder"),
    go: t("map.go"),
    directions: t("map.directions"),
    viewProfile: t("map.viewProfile"),
    gen: (n: number) => t("map.gen", String(n)),
    noAddress: t("map.noAddress"),
  };

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] text-[var(--parchment)]">
      <header className="sticky top-0 z-40 bg-[var(--tapestry-bg)]/90 backdrop-blur-md border-b border-[var(--thread-gold-dim)]/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-sm"
          >
            {strings.tree}
          </Link>
          <Link
            href="/timeline"
            className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-sm"
          >
            {strings.timeline}
          </Link>
          <span className="text-sm text-[var(--thread-gold)] font-medium border-b-2 border-[var(--thread-gold)] py-0.5">
            {strings.map}
          </span>
          <div className="flex-1" />
          <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--parchment-dim)] font-body whitespace-nowrap">
            {loading ? strings.loading : strings.locations(pinned.length)}
          </span>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-3">
          <GeocoderSearch onSearch={handleGeocodeSearch} strings={{ placeholder: strings.searchPlaceholder, go: strings.go }} />
        </div>
      </header>

      <div className="h-[calc(100vh-96px)]">
        <MapContainer
          center={[55.5, -3.5]}
          zoom={6}
          className="h-full w-full"
          style={{ background: "#0E0B0A" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={searchCenter} />
          <FitBounds persons={pinned} />

          {pinned.map((p) => {
            const url = googleMapsUrl(p);
            return (
              <Marker
                key={p.id}
                position={[p.lat!, p.lng!]}
                icon={createPersonIcon(p, genMap)}
              >
                <Popup>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      minWidth: 180,
                      maxWidth: 240,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      {p.fullName}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
                      {p.birthYear} – {p.deathYear ?? "present"}
                    </div>
                    {(p.birthPlace || p.address) && (
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>
                        {p.address || p.birthPlace}
                      </div>
                    )}
                    <div style={{ fontSize: 10, marginTop: 4 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background:
                            GENERATION_COLORS[
                              (genMap[p.id] ?? 0) % GENERATION_COLORS.length
                            ],
                          marginRight: 4,
                          verticalAlign: "middle",
                        }}
                      />
                      {strings.gen((genMap[p.id] ?? 0) + 1)}
                    </div>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          marginTop: 8,
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: "#C9A54418",
                          color: "#C9A544",
                          fontSize: 11,
                          fontWeight: 600,
                          textAlign: "center",
                          textDecoration: "none",
                        }}
                      >
                        🧭 {strings.directions}
                      </a>
                    ) : (
                      <div style={{ fontSize: 10, color: "#999", marginTop: 8 }}>
                        {strings.noAddress}
                      </div>
                    )}
                    <Link
                      href={"/person/" + p.id}
                      style={{
                        fontSize: 11,
                        color: "#C9A24B",
                        textDecoration: "underline",
                        display: "inline-block",
                        marginTop: 6,
                      }}
                    >
                      {strings.viewProfile} →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
