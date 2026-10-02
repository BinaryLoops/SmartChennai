"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

export function DemoModeSwitcher() {
  const { emit, connected: isConnected } = useSocket();
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initial fetch from DB config
    fetch("/api/admin/config")
      .then(res => res.json())
      .then(data => {
        if (data.config) setDemoMode(data.config.demoModeEnabled || false);
      })
      .catch(console.error);
  }, []);

  const toggleDemoMode = () => {
    if (!emit || !isConnected) return;
    setLoading(true);
    const newState = !demoMode;
    // Emit over socket so worker picks it up immediately
    emit("settings:update", { demoModeEnabled: newState }, (ack: any) => {
      if (ack) {
        setDemoMode(ack.demoModeEnabled || false);
      }
      setLoading(false);
    });
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      {!mounted ? (
        <button
          disabled
          className="px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border bg-base text-text-muted border-border opacity-50 cursor-not-allowed"
        >
          Demo Mode
        </button>
      ) : (
        <button
          onClick={toggleDemoMode}
        disabled={loading || !isConnected}
        className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border transition-all ${
          demoMode 
            ? "bg-accent-cyan/20 border-accent-cyan text-accent-cyan animate-pulse" 
            : "bg-base text-text-muted border-border hover:text-text-primary hover:border-text-muted"
        } ${(!isConnected || loading) ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {demoMode ? "Demo Live" : "Demo Mode"}
        </button>
      )}
    </div>
  );
}
