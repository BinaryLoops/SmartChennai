"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);

// MapClickHandler loaded dynamically
const MapClickHandlerInner = dynamic(
  () => import("./MapClickHandler").then((m) => m.MapClickHandler),
  { ssr: false }
);

const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];
const CHENNAI_ZOOM = 12;

// Chennai metropolitan bounds
const CHENNAI_BOUNDS = {
  latMin: 12.75,
  latMax: 13.40,
  lngMin: 79.90,
  lngMax: 80.45,
};

function isWithinChennai(lat: number, lng: number): boolean {
  return (
    lat >= CHENNAI_BOUNDS.latMin &&
    lat <= CHENNAI_BOUNDS.latMax &&
    lng >= CHENNAI_BOUNDS.lngMin &&
    lng <= CHENNAI_BOUNDS.lngMax
  );
}

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  onError?: (message: string) => void;
}

export function LocationPicker({ lat, lng, onLocationChange, onError }: LocationPickerProps) {
  const t = useTranslations("citizen.report");
  const [mounted, setMounted] = useState(false);
  const [locating, setLocating] = useState(false);
  const [icon, setIcon] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Create custom icon after mount (Leaflet needs window)
    import("leaflet").then((L) => {
      const customIcon = L.divIcon({
        className: "citizen-marker",
        html: `<div style="
          width: 28px; height: 28px; 
          background: linear-gradient(135deg, #22D3EE, #06B6D4);
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.6), 0 4px 12px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      setIcon(customIcon);
    });
  }, []);

  const handleMapClick = useCallback(
    (clickLat: number, clickLng: number) => {
      if (isWithinChennai(clickLat, clickLng)) {
        onLocationChange(clickLat, clickLng);
      } else {
        onError?.(t("outsideBounds"));
      }
    },
    [onLocationChange, onError, t]
  );

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      onError?.(t("locationError"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (isWithinChennai(latitude, longitude)) {
          onLocationChange(latitude, longitude);
        } else {
          onError?.(t("outsideBounds"));
        }
        setLocating(false);
      },
      () => {
        onError?.(t("locationError"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocationChange, onError, t]);

  if (!mounted) {
    return (
      <div className="h-64 w-full rounded-xl border border-border bg-base-card">
        <div className="skeleton h-full w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border sm:h-80">
        <MapContainer
          center={CHENNAI_CENTER}
          zoom={CHENNAI_ZOOM}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
          style={{ background: "#0B0E14" }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          />
          <MapClickHandlerInner onMapClick={handleMapClick} />
          {lat !== null && lng !== null && icon && (
            <Marker position={[lat, lng]} icon={icon} />
          )}
        </MapContainer>

        {/* Hint overlay */}
        {lat === null && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg bg-base/80 px-4 py-2 text-sm text-text-secondary backdrop-blur-sm">
              📍 {t("clickMapHint")}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="flex items-center gap-2 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2.5 text-sm font-medium text-accent-cyan transition-all hover:bg-accent-cyan/20 disabled:opacity-50"
        >
          {locating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
              {t("locating")}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t("useMyLocation")}
            </>
          )}
        </button>

        <div className="text-sm text-text-secondary">
          {lat !== null && lng !== null ? (
            <span className="font-mono text-accent-cyan">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          ) : (
            <span className="text-text-muted">{t("noLocation")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
