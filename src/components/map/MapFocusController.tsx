"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useMapFocus } from "./MapContext";

export function MapFocusController() {
  const map = useMap();
  const { focus } = useMapFocus();

  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], focus.zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [focus, map]);

  return null;
}
