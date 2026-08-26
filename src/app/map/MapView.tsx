"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useAdvancedMarkerRef,
  Polyline,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
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

const TRAVEL_MODES = [
  { mode: google.maps.TravelMode.DRIVING, label: "Driving" },
  { mode: google.maps.TravelMode.WALKING, label: "Walking" },
  { mode: google.maps.TravelMode.TRANSIT, label: "Transit" },
  { mode: google.maps.TravelMode.BICYCLING, label: "Bicycling" },
] as const;

function FitBounds({ persons: ps }: { persons: Person[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const coords = ps
      .filter((p) => p.lat && p.lng)
      .map((p) => new google.maps.LatLng(p.lat!, p.lng!));
    if (coords.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    coords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, 60);
  }, [ps, map]);
  return null;
}

function DirectionsRenderer({ result }: { result: google.maps.DirectionsResult }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !result) return;
    const renderer = new google.maps.DirectionsRenderer({
      map,
      directions: result,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#3E6B5C",
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });
    return () => {
      renderer.setMap(null);
    };
  }, [map, result]);
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

function PersonMarker({
  person,
  onOpen,
  showInfo,
  onClose,
}: {
  person: Person;
  onOpen: (p: Person) => void;
  showInfo: boolean;
  onClose: () => void;
}) {
  const gen = GENERATIONS[person.id] ?? 0;
  const color = GENERATION_COLORS[gen] ?? "#C9A24B";
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    if (showInfo && marker) {
      onOpen(person);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInfo, marker]);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: person.lat!, lng: person.lng! }}
        onClick={() => onOpen(person)}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: person.isAlive ? color : "transparent",
            border: `3px solid ${color}`,
            opacity: person.isAlive ? 1 : 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 10px ${color}44`,
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={person.isAlive ? "#fff" : color} strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
      </AdvancedMarker>

      {showInfo && marker && (
        <InfoWindow
          position={{ lat: person.lat!, lng: person.lng! }}
          onCloseClick={onClose}
        >
          <div style={{ fontFamily: "Inter, sans-serif", minWidth: 180, maxWidth: 260 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{person.fullName}</div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
              {person.birthYear} – {person.deathYear ?? "present"}
            </div>
            {person.birthPlace && <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>{person.birthPlace}</div>}
            {person.profession && <div style={{ fontSize: 11, color: "#999", fontStyle: "italic" }}>{person.profession}</div>}
            <div style={{ fontSize: 10, marginTop: 4 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 4, verticalAlign: "middle" }} />
              Generation {gen + 1}
            </div>
            <Link
              href={`/person/${person.id}`}
              style={{ fontSize: 11, color: "#C9A24B", textDecoration: "underline", display: "inline-block", marginTop: 4 }}
            >
              View Profile →
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapInner({
  selectedId,
  onSelectPerson,
  onClosePerson,
  searchCenter,
  migrationArcs,
  directionsTarget,
  userPosition,
  directionsResult,
}: {
  selectedId: string | null;
  onSelectPerson: (p: Person) => void;
  onClosePerson: () => void;
  searchCenter: google.maps.LatLngLiteral | null;
  migrationArcs: { from: Person; to: Person; type: string }[];
  directionsTarget: Person | null;
  userPosition: google.maps.LatLngLiteral | null;
  directionsResult: google.maps.DirectionsResult | null;
}) {
  const map = useMap();
  const personsWithCoords = useMemo(() => persons.filter((p) => p.lat && p.lng), []);

  useEffect(() => {
    if (map && searchCenter) {
      map.panTo(searchCenter);
      map.setZoom(10);
    }
  }, [map, searchCenter]);

  return (
    <>
      <FitBounds persons={personsWithCoords} />

      {personsWithCoords.map((p) => (
        <PersonMarker
          key={p.id}
          person={p}
          onOpen={onSelectPerson}
          showInfo={selectedId === p.id}
          onClose={onClosePerson}
        />
      ))}

      {migrationArcs.map((arc, i) => {
        const isParentChild = arc.type === "parent-child";
        const isDivorced = arc.type === "divorced";
        return (
          <Polyline
            key={i}
            path={[
              { lat: arc.from.lat!, lng: arc.from.lng! },
              { lat: arc.to.lat!, lng: arc.to.lng! },
            ]}
            strokeColor={isDivorced ? "#8B2E2E" : isParentChild ? "#C9A24B88" : "#C9A24B"}
            strokeWeight={isParentChild ? 1.5 : 2}
            strokeOpacity={isParentChild ? 0.4 : 0.6}
          />
        );
      })}

      {directionsTarget && userPosition && directionsResult && (
        <DirectionsRenderer result={directionsResult} />
      )}
    </>
  );
}

export default function MapView() {
  const { canEdit } = useAuth();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<google.maps.LatLng | null>(null);
  const [searchCenter, setSearchCenter] = useState<google.maps.LatLngLiteral | null>(null);

  const [directionsTarget, setDirectionsTarget] = useState<Person | null>(null);
  const [userPosition, setUserPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode>(google.maps.TravelMode.DRIVING);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const personsWithCoords = useMemo(() => persons.filter((p) => p.lat && p.lng), []);

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

  const handleSelectPerson = useCallback((p: Person) => {
    setSelectedPerson(p);
    setSelectedId(p.id);
    setDirectionsTarget(null);
    setDirectionsResult(null);
  }, []);

  const handleGeocodeSearch = useCallback((q: string) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: q }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
        const loc = results[0].geometry.location;
        setSearchCenter({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, []);

  const handleGetDirections = useCallback((p: Person) => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setDirectionsTarget(p);
        setDirectionsResult(null);
      },
      () => {
        setGeoError("Unable to get your location. Please allow location access.");
      }
    );
  }, []);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!pinMode || !e.detail.latLng) return;
      setPendingLatLng(new google.maps.LatLng(e.detail.latLng.lat, e.detail.latLng.lng));
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
            lat: pendingLatLng.lat(),
            lng: pendingLatLng.lng(),
          }),
        });
        if (res.ok) {
          const person = persons.find((p) => p.id === personId);
          if (person) {
            person.lat = pendingLatLng.lat();
            person.lng = pendingLatLng.lng();
          }
        }
      } catch {}
      setShowPersonPicker(false);
      setPendingLatLng(null);
    },
    [pendingLatLng]
  );

  const handleDirectionsRequest = useCallback(() => {
    if (directionsTarget && userPosition) {
      const service = new google.maps.DirectionsService();
      service.route(
        { origin: userPosition, destination: { lat: directionsTarget.lat!, lng: directionsTarget.lng! }, travelMode },
        (result, status) => {
          setDirectionsResult(status === google.maps.DirectionsStatus.OK && result ? result : null);
        }
      );
    }
  }, [directionsTarget, userPosition, travelMode]);

  useEffect(() => {
    if (directionsTarget && userPosition) {
      handleDirectionsRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelMode]);

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

          {canEdit && (
            <button
              onClick={() => {
                setPinMode(!pinMode);
                setShowPersonPicker(false);
                setPendingLatLng(null);
              }}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                pinMode
                  ? "bg-[var(--thread-gold)] text-[var(--tapestry-bg)] border-[var(--thread-gold)]"
                  : "border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)]"
              }`}
            >
              {pinMode ? "Pinning..." : "Pin Location"}
            </button>
          )}

          <span className="text-xs text-[var(--parchment-dim)]">{personsWithCoords.length} locations</span>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-3">
          <GeocoderSearch onSearch={handleGeocodeSearch} />
        </div>
      </header>

      <div className="h-[calc(100vh-96px)]">
        <Map
          defaultCenter={{ lat: 55.5, lng: -3.5 }}
          defaultZoom={6}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="family-tapestry-map"
          onClick={handleMapClick}
          className="h-full w-full"
        >
          <MapInner
            selectedId={selectedId}
            onSelectPerson={handleSelectPerson}
            onClosePerson={() => { setSelectedId(null); setSelectedPerson(null); }}
            searchCenter={searchCenter}
            migrationArcs={migrationArcs}
            directionsTarget={directionsTarget}
            userPosition={userPosition}
            directionsResult={directionsResult}
          />
        </Map>
      </div>

      {selectedPerson && !pinMode && (
        <div className="fixed bottom-4 left-4 z-50 bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/20 rounded-xl p-4 max-w-sm w-[320px] shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-sm text-[var(--parchment)]">{selectedPerson.fullName}</h3>
            <button onClick={() => { setSelectedPerson(null); setSelectedId(null); setDirectionsTarget(null); setDirectionsResult(null); }} className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] text-xs">✕</button>
          </div>

          <div className="flex gap-1 mb-3">
            {TRAVEL_MODES.map((tm) => (
              <button
                key={tm.mode}
                onClick={() => {
                  setTravelMode(tm.mode);
                  setDirectionsResult(null);
                }}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  travelMode === tm.mode
                    ? "bg-[var(--thread-gold)] text-[var(--tapestry-bg)]"
                    : "bg-white/5 text-[var(--parchment-dim)] hover:text-[var(--parchment)]"
                }`}
              >
                {tm.label}
              </button>
            ))}
          </div>

          {geoError && <p className="text-[10px] text-[var(--ember-red)] mb-2">{geoError}</p>}

          {!directionsResult ? (
            <button
              onClick={() => handleGetDirections(selectedPerson)}
              className="w-full py-2 text-xs rounded bg-[var(--thread-gold)]/20 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/30 transition-colors"
            >
              Get Directions
            </button>
          ) : (
            <div className="space-y-2">
              {directionsResult.routes[0]?.legs[0] && (
                <div className="flex gap-4 text-[10px] text-[var(--parchment-dim)]">
                  <span>Distance: <strong className="text-[var(--parchment)]">{directionsResult.routes[0].legs[0].distance?.text}</strong></span>
                  <span>Duration: <strong className="text-[var(--parchment)]">{directionsResult.routes[0].legs[0].duration?.text}</strong></span>
                </div>
              )}
              <button
                onClick={() => { setDirectionsTarget(null); setDirectionsResult(null); }}
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
            <h3 className="font-display text-sm text-[var(--parchment)] mb-3">Pin location to person</h3>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {persons.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePinPerson(p.id)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-[var(--thread-gold)]/10 text-sm text-[var(--parchment)] font-body transition-colors"
                >
                  {p.fullName}
                  <span className="ml-2 text-[10px] text-[var(--parchment-dim)]">
                    {p.lat?.toFixed(2)}, {p.lng?.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowPersonPicker(false); setPendingLatLng(null); }}
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
