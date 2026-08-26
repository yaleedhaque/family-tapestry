"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { persons, unions, parentEdges } from "@/data/family";
import type { Person } from "@/data/family";
import { useAuth } from "@/components/AuthProvider";

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

const TRAVEL_MODES = ["driving", "walking", "cycling"] as const;

function createPersonIcon(person: Person) {
  const gen = GENERATIONS[person.id] ?? 0;
  const color = GENERATION_COLORS[gen] ?? "#C9A24B";
  const alive = person.isAlive;
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

function FitBounds({ persons: ps }: { persons: Person[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || ps.length === 0) return;
    const bounds = L.latLngBounds(
      ps.map((p) => [p.lat!, p.lng!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [ps, map]);
  return null;
}

function MapEventHandler({
  onMapClick,
}: {
  onMapClick: (e: LeafletMouseEvent) => void;
}) {
  useMapEvents({ click: onMapClick });
  return null;
}

function SearchHandler({
  searchCenter,
}: {
  searchCenter: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (map && searchCenter) {
      map.setView(searchCenter, 10);
    }
  }, [map, searchCenter]);
  return null;
}

function GeocoderSearch({ onSearch }: { onSearch: (q: string) => void }) {
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
        placeholder="Search location..."
        className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-1.5 text-xs text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]"
      />
      <button
        onClick={() => {
          if (query.trim()) onSearch(query.trim());
        }}
        className="px-3 py-1.5 text-xs rounded bg-[var(--thread-gold)]/20 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/30 transition-colors"
      >
        Go
      </button>
    </div>
  );
}

export default function MapView() {
  const { canEdit } = useAuth();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<[number, number] | null>(
    null
  );
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(
    null
  );
  const [directionsTarget, setDirectionsTarget] = useState<Person | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null
  );
  const [travelMode, setTravelMode] = useState<string>("driving");
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const personsWithCoords = useMemo(
    () => persons.filter((p) => p.lat && p.lng),
    []
  );

  const migrationArcs = useMemo(() => {
    const arcs: { from: Person; to: Person; type: string }[] = [];
    for (const u of unions) {
      const a = persons.find((p) => p.id === u.partnerA);
      const b = persons.find((p) => p.id === u.partnerB);
      if (
        a?.lat &&
        a.lng &&
        b?.lat &&
        b.lng &&
        (a.lat !== b.lat || a.lng !== b.lng)
      ) {
        arcs.push({ from: a, to: b, type: u.type });
      }
    }
    const seen = new Set<string>();
    for (const pe of parentEdges) {
      const union = unions.find((u) => u.id === pe.unionId);
      if (!union) continue;
      const child = persons.find((p) => p.id === pe.childId);
      const parent = persons.find(
        (p) => p.id === union.partnerA || p.id === union.partnerB
      );
      if (
        child?.lat &&
        child.lng &&
        parent?.lat &&
        parent.lng &&
        (child.lat !== parent.lat || child.lng !== parent.lng)
      ) {
        const key = parent.id + "->" + child.id;
        if (!seen.has(key)) {
          seen.add(key);
          arcs.push({ from: parent, to: child, type: "parent-child" });
        }
      }
    }
    return arcs;
  }, []);

  const handleSelectPerson = useCallback((p: Person) => {
    setSelectedPerson(p);
    setDirectionsTarget(null);
    setRouteCoords([]);
    setRouteInfo(null);
  }, []);

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

  const fetchRoute = useCallback(
    (origin: [number, number], dest: Person, mode: string) => {
      setLoadingRoute(true);
      setRouteCoords([]);
      setRouteInfo(null);
      const url =
        "https://router.project-osrm.org/route/v1/"
        + mode
        + "/"
        + origin[1]
        + ","
        + origin[0]
        + ";"
        + dest.lng
        + ","
        + dest.lat
        + "?overview=full&geometries=geojson";
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number]
            );
            setRouteCoords(coords);
            const dist = route.distance;
            const dur = route.duration;
            setRouteInfo({
              distance:
                dist >= 1000
                  ? (dist / 1000).toFixed(1) + " km"
                  : Math.round(dist) + " m",
              duration:
                dur >= 3600
                  ? Math.floor(dur / 3600)
                    + "h "
                    + Math.round((dur % 3600) / 60)
                    + "m"
                  : Math.round(dur / 60) + " min",
            });
          }
        })
        .catch(() => {
          /* noop */
        })
        .finally(() => setLoadingRoute(false));
    },
    []
  );

  const handleGetDirections = useCallback(
    (p: Person) => {
      if (!navigator.geolocation) {
        setGeoError("Geolocation not supported");
        return;
      }
      setGeoError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const up: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          setUserPosition(up);
          setDirectionsTarget(p);
          fetchRoute(up, p, travelMode);
        },
        () => setGeoError("Unable to get your location")
      );
    },
    [travelMode, fetchRoute]
  );

  useEffect(() => {
    if (directionsTarget && userPosition) {
      fetchRoute(userPosition, directionsTarget, travelMode);
    }
  }, [travelMode, directionsTarget, userPosition, fetchRoute]);

  const handleMapClick = useCallback(
    (e: LeafletMouseEvent) => {
      if (!pinMode) return;
      setPendingLatLng([e.latlng.lat, e.latlng.lng]);
      setShowPersonPicker(true);
    },
    [pinMode]
  );

  const handlePinPerson = useCallback(
    async (personId: string) => {
      if (!pendingLatLng) return;
      try {
        const res = await fetch("/api/tree/persons", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: personId,
            lat: pendingLatLng[0],
            lng: pendingLatLng[1],
          }),
        });
        if (res.ok) {
          const person = persons.find((p) => p.id === personId);
          if (person) {
            person.lat = pendingLatLng[0];
            person.lng = pendingLatLng[1];
          }
        }
      } catch {
        /* noop */
      }
      setShowPersonPicker(false);
      setPendingLatLng(null);
    },
    [pendingLatLng]
  );

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] text-[var(--parchment)]">
      <header className="sticky top-0 z-40 bg-[var(--tapestry-bg)]/90 backdrop-blur-md border-b border-[var(--thread-gold-dim)]/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-sm"
          >
            Tree
          </Link>
          <Link
            href="/timeline"
            className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-sm"
          >
            Timeline
          </Link>
          <span className="text-sm text-[var(--thread-gold)]">Map</span>
          <div className="flex-1" />
          {canEdit && (
            <button
              onClick={() => {
                setPinMode(!pinMode);
                setShowPersonPicker(false);
                setPendingLatLng(null);
              }}
              className={
                "px-3 py-1.5 text-xs rounded border transition-colors "
                + (pinMode
                  ? "bg-[var(--ember-red)]/20 border-[var(--ember-red)]/50 text-[var(--ember-red)]"
                  : "border-[var(--thread-gold-dim)]/30 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10")
              }
            >
              {pinMode ? "Pinning..." : "Pin Location"}
            </button>
          )}
          <span className="text-xs text-[var(--parchment-dim)]">
            {personsWithCoords.length} locations
          </span>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-3">
          <GeocoderSearch onSearch={handleGeocodeSearch} />
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
          <MapEventHandler onMapClick={handleMapClick} />
          <SearchHandler searchCenter={searchCenter} />
          <FitBounds persons={personsWithCoords} />

          {personsWithCoords.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat!, p.lng!]}
              icon={createPersonIcon(p)}
              eventHandlers={{ click: () => handleSelectPerson(p) }}
            >
              <Popup>
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    minWidth: 180,
                    maxWidth: 260,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      marginBottom: 4,
                    }}
                  >
                    {p.fullName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 2,
                    }}
                  >
                    {p.birthYear} – {p.deathYear ?? "present"}
                  </div>
                  {p.birthPlace && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#888",
                        marginBottom: 2,
                      }}
                    >
                      {p.birthPlace}
                    </div>
                  )}
                  {p.profession && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#999",
                        fontStyle: "italic",
                      }}
                    >
                      {p.profession}
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
                          GENERATION_COLORS[GENERATIONS[p.id] ?? 0],
                        marginRight: 4,
                        verticalAlign: "middle",
                      }}
                    />
                    Generation {(GENERATIONS[p.id] ?? 0) + 1}
                  </div>
                  <Link
                    href={"/person/" + p.id}
                    style={{
                      fontSize: 11,
                      color: "#C9A24B",
                      textDecoration: "underline",
                      display: "inline-block",
                      marginTop: 4,
                    }}
                  >
                    View Profile →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}

          {migrationArcs.map((arc, i) => (
            <Polyline
              key={i}
              positions={[
                [arc.from.lat!, arc.from.lng!],
                [arc.to.lat!, arc.to.lng!],
              ]}
              pathOptions={{
                color: arc.type === "divorced" ? "#8B2E2E" : "#C9A24B",
                weight: arc.type === "parent-child" ? 1.5 : 2,
                opacity: arc.type === "parent-child" ? 0.4 : 0.6,
                dashArray: arc.type === "parent-child" ? "4 4" : undefined,
              }}
            />
          ))}

          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: "#3E6B5C",
                weight: 4,
                opacity: 0.8,
              }}
            />
          )}
        </MapContainer>
      </div>

      {selectedPerson && !pinMode && (
        <div className="fixed bottom-4 left-4 z-50 bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/20 rounded-xl p-4 max-w-sm w-[320px] shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-sm text-[var(--parchment)]">
              {selectedPerson.fullName}
            </h3>
            <button
              onClick={() => {
                setSelectedPerson(null);
                setDirectionsTarget(null);
                setRouteCoords([]);
                setRouteInfo(null);
              }}
              className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-1 mb-3">
            {TRAVEL_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setTravelMode(mode);
                  setRouteCoords([]);
                  setRouteInfo(null);
                }}
                className={
                  "px-2 py-1 text-[10px] rounded capitalize transition-colors "
                  + (travelMode === mode
                    ? "bg-[var(--thread-gold)]/20 text-[var(--thread-gold)]"
                    : "text-[var(--parchment-dim)] hover:text-[var(--parchment)]")
                }
              >
                {mode}
              </button>
            ))}
          </div>

          {geoError && (
            <p className="text-[10px] text-[var(--ember-red)] mb-2">
              {geoError}
            </p>
          )}
          {loadingRoute && (
            <p className="text-[10px] text-[var(--parchment-dim)] mb-2">
              Calculating route...
            </p>
          )}

          {!directionsTarget ? (
            <button
              onClick={() => handleGetDirections(selectedPerson)}
              className="w-full py-2 text-xs rounded bg-[var(--thread-gold)]/20 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/30 transition-colors"
            >
              Get Directions
            </button>
          ) : (
            <div className="space-y-2">
              {routeInfo && (
                <div className="flex gap-4 text-[10px] text-[var(--parchment-dim)]">
                  <span>
                    Distance:{" "}
                    <strong className="text-[var(--parchment)]">
                      {routeInfo.distance}
                    </strong>
                  </span>
                  <span>
                    Duration:{" "}
                    <strong className="text-[var(--parchment)]">
                      {routeInfo.duration}
                    </strong>
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  setDirectionsTarget(null);
                  setRouteCoords([]);
                  setRouteInfo(null);
                }}
                className="text-[10px] text-[var(--parchment-dim)] hover:text-[var(--parchment)]"
              >
                Clear route
              </button>
            </div>
          )}
        </div>
      )}

      {showPersonPicker && pinMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/20 rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="font-display text-sm text-[var(--parchment)] mb-3">
              Pin location to person
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {persons.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePinPerson(p.id)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-[var(--thread-gold)]/10 text-sm text-[var(--parchment)] font-body transition-colors"
                >
                  {p.fullName}
                  <span className="ml-2 text-[10px] text-[var(--parchment-dim)]">
                    {p.lat != null ? p.lat.toFixed(2) : "—"},{" "}
                    {p.lng != null ? p.lng.toFixed(2) : "—"}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowPersonPicker(false);
                setPendingLatLng(null);
              }}
              className="mt-3 w-full py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
