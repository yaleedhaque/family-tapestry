"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveTree } from "@/lib/useLiveTree";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import type { PersonLike } from "@/components/InfoPanel";
import { computeGenerationMap, GENERATION_COLORS } from "@/lib/generation";
import { useLang } from "@/lib/i18n";
import { toPersonLike, toUnionLike, toEdgeLike } from "@/lib/convert";

type GenMap = Record<string, number>;

/* An address-derived pin is drawn identically but flagged in the popup so the
   user knows the person's spot came from their saved address, not a manually
   dropped coordinate. */
type MapPerson = PersonLike & { isAddressPin?: boolean };

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

/* A temporary "drop here" pin shown while placing a person on the map. */
function dropPinIcon() {
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    html:
      '<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:#E2554B;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.5);border:2px solid #fff">' +
      '<span style="width:12px;height:12px;border-radius:50%;background:#fff;transform:rotate(45deg)"></span></div>',
  });
}

/* While dropping, a single click on the map reports the coordinate. */
function DropEvents({ enabled, onDrop }: { enabled: boolean; onDrop: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      if (enabled) onDrop(e.latlng.lat, e.latlng.lng);
    },
  });
  // Change the cursor to hint that a click places a pin.
  useEffect(() => {
    if (!map) return;
    map.getContainer().style.cursor = enabled ? "crosshair" : "";
  }, [map, enabled]);
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

export default function MapView() {
  const { canEdit } = useAuth();
  const { t } = useLang();

  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);

  /* Live tree — fetches /api/tree, subscribes to realtime, and refetches when
     the tab regains focus, so any person edit/removal lands here immediately. */
  const live = useLiveTree();

  const persons = useMemo(
    () => (live.persons ?? []).map(toPersonLike),
    [live.persons]
  );
  const unions = useMemo(
    () => (live.unions ?? []).map(toUnionLike),
    [live.unions]
  );
  const edges = useMemo(
    () => (live.edges ?? []).map(toEdgeLike),
    [live.edges]
  );
  const loading = live.loading;

  /* Pin-drop flow */
  const [showPicker, setShowPicker] = useState(false);
  const [pinTarget, setPinTarget] = useState<PersonLike | null>(null);
  const [tempPin, setTempPin] = useState<[number, number] | null>(null);
  const [saving, setSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  const genMap = useMemo(
    () => computeGenerationMap(persons, unions, edges),
    [persons, unions, edges]
  );

  /* Address-based auto-pins: people with an address (but no saved coordinates)
     get geocoded and pinned automatically, so "put the address in the profile"
     is enough to appear on the big map. Cached per session to stay polite to
     Nominatim. */
  const geoCacheRef = useRef<Map<string, [number, number]>>(new Map());
  const [autoPins, setAutoPins] = useState<Record<string, [number, number]>>({});

  /* Geocode every address-only person once per session. Skips people who
     already have saved coordinates (their explicit pin wins). */
  useEffect(() => {
    let cancelled = false;
    const pending = persons.filter(
      (p) =>
        (p.lat == null || p.lng == null) &&
        (p.address?.trim() || p.birthPlace?.trim()) &&
        !autoPins[p.id]
    );
    (async () => {
      for (const p of pending) {
        if (cancelled) break;
        const q = p.address?.trim() || p.birthPlace?.trim() || "";
        if (!q) continue;
        let coord: [number, number] | null | undefined = geoCacheRef.current.get(q);
        if (coord == null) {
          coord = await geocode(q);
          if (coord) geoCacheRef.current.set(q, coord);
        }
        if (coord && !cancelled) {
          setAutoPins((prev) => ({ ...prev, [p.id]: coord }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persons, live.refreshedAt]);

  /* Auto-pinned addresses are cleared when the person gains real coordinates,
     loses their address, or is deleted entirely. */
  useEffect(() => {
    setAutoPins((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        const p = persons.find((x) => x.id === id);
        if (!p) delete next[id];
        else if (p.lat != null && p.lng != null) delete next[id];
        else if (!(p.address?.trim() || p.birthPlace?.trim())) delete next[id];
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persons, live.refreshedAt]);

  /* Pin on the big map = explicit saved coords + auto-pinned addresses. */
  const pinned = useMemo(() => {
    const explicit = persons
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({ ...p, isAddressPin: false }));
    const auto = persons
      .filter((p) => {
        const c = autoPins[p.id];
        return p.lat == null && p.lng == null && c;
      })
      .map((p) => ({
        ...p,
        lat: autoPins[p.id][0],
        lng: autoPins[p.id][1],
        isAddressPin: true,
      })) as unknown as MapPerson[];
    return [...explicit, ...auto];
  }, [persons, autoPins]);

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

  const geocode = useCallback(async (q: string): Promise<[number, number] | null> => {
    try {
      const res = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&q="
          + encodeURIComponent(q)
          + "&limit=1",
        { headers: { "User-Agent": "FamilyTapestry/1.0" } }
      );
      const results = await res.json();
      if (results[0]) {
        return [parseFloat(results[0].lat), parseFloat(results[0].lon)];
      }
    } catch {
      /* noop */
    }
    return null;
  }, []);

  /* Start placing a pin for the chosen person: move the map to their saved
     coords or geocoded address, then wait for a click to drop the pin. */
  const startPinning = useCallback(
    async (person: PersonLike) => {
      setPinTarget(person);
      setTempPin(null);
      setPinMsg(null);
      let center: [number, number] | null = null;
      if (person.lat != null && person.lng != null) {
        center = [person.lat, person.lng];
      } else {
        const q = person.address?.trim() || person.birthPlace?.trim() || person.fullName;
        center = q ? await geocode(q) : null;
      }
      if (center) setSearchCenter(center);
      setShowPicker(false);
      setPinMsg(t("map.pickSpot"));
    },
    [geocode, t]
  );

  const dropPin = useCallback(
    async (lat: number, lng: number) => {
      if (!pinTarget || saving) return;
      setTempPin([lat, lng]);
      setSaving(true);
      setPinMsg(null);
      try {
        const res = await fetch("/api/tree/persons", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pinTarget.id, lat, lng }),
        });
        if (res.ok) {
          setPinMsg(t("map.pinSaved"));
          void live.refetch();
        } else {
          setPinMsg(t("map.pinError"));
        }
      } catch {
        setPinMsg(t("map.pinError"));
      }
      setSaving(false);
      setTempPin(null);
      setPinTarget(null);
    },
    [pinTarget, saving, t, live]
  );

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
    pin: t("map.pin"),
    pinPerson: t("map.pinPerson"),
    pinning: t("map.pinning"),
    cancel: t("common.cancel"),
    searchPeople: t("map.pinSearch"),
    movePin: t("map.movePin"),
    removePin: t("map.removePin"),
    pinRemoved: t("map.pinRemoved"),
    pinFromAddress: t("map.pinFromAddress"),
  };

  /* Clear a manually dropped pin for a person (address-derived pins vanish on
     their own once the address is removed from the profile). */
  const removePin = useCallback(
    async (person: PersonLike) => {
      if (saving) return;
      setSaving(true);
      setPinMsg(null);
      try {
        const res = await fetch("/api/tree/persons", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: person.id, lat: null, lng: null }),
        });
        setPinMsg(res.ok ? t("map.pinRemoved") : t("map.pinError"));
        if (res.ok) void live.refetch();
      } catch {
        setPinMsg(t("map.pinError"));
      }
      setSaving(false);
    },
    [saving, live, t]
  );

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
          {canEdit && (
            <button
              onClick={() => { setShowPicker((s) => !s); setPinMsg(null); }}
              className={
                "px-3 py-1.5 text-xs rounded border transition-colors whitespace-nowrap "
                + (pinTarget
                  ? "bg-[var(--divorce-red)]/20 border-[var(--divorce-red)]/50 text-[var(--divorce-red)]"
                  : "border-[var(--thread-gold-dim)]/30 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10")
              }
            >
              {pinTarget ? strings.pinning : strings.pin}
            </button>
          )}
          <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--parchment-dim)] font-body whitespace-nowrap">
            {loading ? strings.loading : strings.locations(pinned.length)}
          </span>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-3">
          <GeocoderSearch onSearch={handleGeocodeSearch} strings={{ placeholder: strings.searchPlaceholder, go: strings.go }} />
        </div>
      </header>

      {showPicker && (
        <PersonPicker
          people={persons}
          onPick={startPinning}
          onCancel={() => setShowPicker(false)}
          strings={{ title: strings.pinPerson, search: strings.searchPeople, cancel: strings.cancel }}
        />
      )}

      {pinMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/40 text-xs text-[var(--parchment)] shadow-2xl pointer-events-none">
          {pinMsg}
        </div>
      )}

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
          <DropEvents enabled={!!pinTarget} onDrop={dropPin} />

          {tempPin && (
            <Marker
              position={tempPin}
              icon={dropPinIcon()}
              zIndexOffset={1000}
            />
          )}

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
                    {p.isAddressPin && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "#3E6B5C",
                          marginBottom: 4,
                          background: "#3E6B5C18",
                          borderRadius: 4,
                          padding: "2px 6px",
                          display: "inline-block",
                        }}
                      >
                        {strings.pinFromAddress}
                      </div>
                    )}
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
                    {canEdit && !p.isAddressPin && (
                      <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => startPinning(p)}
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#C9A544",
                          textDecoration: "underline",
                          background: "none",
                          border: "none",
                          padding: 0,
                          marginTop: 6,
                          cursor: "pointer",
                        }}
                      >
                        📍 {strings.movePin}
                      </button>
                      <button
                        onClick={() => void removePin(p)}
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#E2554B",
                          textDecoration: "underline",
                          background: "none",
                          border: "none",
                          padding: 0,
                          marginTop: 6,
                          cursor: "pointer",
                        }}
                      >
                        ✕ {strings.removePin}
                      </button>
                      </div>
                    )}
                    {canEdit && p.isAddressPin && (
                      <button
                        onClick={() => startPinning(p)}
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#C9A544",
                          textDecoration: "underline",
                          background: "none",
                          border: "none",
                          padding: 0,
                          marginTop: 6,
                          cursor: "pointer",
                        }}
                      >
                        📍 {strings.movePin}
                      </button>
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

/* A light, filterable list to choose which person to place on the map. */
function PersonPicker({
  people,
  onPick,
  onCancel,
  strings,
}: {
  people: PersonLike[];
  onPick: (p: PersonLike) => void;
  onCancel: () => void;
  strings: { title: string; search: string; cancel: string };
}) {
  const [q, setQ] = useState("");
  const shown = people
    .filter((p) => (p.lat == null && p.lng == null) || q.trim())
    .filter((p) => !q.trim() || p.fullName.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 40);

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center pt-16 px-4">
      <div
        className="absolute inset-0 bg-[var(--overlay-scrim)]"
        onClick={onCancel}
      />
      <div className="relative bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/30 rounded-xl p-5 w-full max-w-sm shadow-2xl">
        <h3 className="font-display text-sm text-[var(--parchment)] mb-3">
          {strings.title}
        </h3>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={strings.search}
          autoFocus
          className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)] mb-3"
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {shown.length === 0 ? (
            <p className="text-xs text-[var(--parchment-dim)] italic px-1 py-2">
              {strings.search && q ? "—" : ""}
            </p>
          ) : (
            shown.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p)}
                className="w-full text-left px-3 py-2 rounded hover:bg-[var(--thread-gold)]/10 text-sm text-[var(--parchment)] font-body transition-colors flex items-center gap-2"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: p.lat != null ? "var(--thread-gold)" : "var(--parchment-dim)" }}
                />
                <span className="truncate">{p.fullName}</span>
                {p.lat != null && (
                  <span className="ml-auto text-[9px] text-[var(--parchment-dim)] shrink-0">✓</span>
                )}
              </button>
            ))
          )}
        </div>
        <button
          onClick={onCancel}
          className="mt-3 w-full py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors"
        >
          {strings.cancel}
        </button>
      </div>
    </div>
  );
}
