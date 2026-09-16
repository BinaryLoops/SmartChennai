"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface FocusState {
  lat: number;
  lng: number;
  zoom: number;
  assetId?: string;
  assetType?: string;
  zoneId?: string;
  zoneName?: string;
}

interface MapContextValue {
  focus: FocusState | null;
  setFocus: (focus: FocusState | null) => void;
}

const MapContext = createContext<MapContextValue | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [focus, setFocus] = useState<FocusState | null>(null);

  return (
    <MapContext.Provider value={{ focus, setFocus }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapFocus = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapFocus must be used within a MapProvider");
  }
  return context;
};
