"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

export function ConnectionStatus() {
  const { connected: isConnected } = useSocket();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 print:hidden bg-base rounded-md px-2 py-1 border border-border" title="Connecting...">
        <span className={`relative flex h-2.5 w-2.5`}>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500`}></span>
        </span>
        <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
          Offline
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 print:hidden bg-base rounded-md px-2 py-1 border border-border" title={isConnected ? "Live Connection Active" : "Reconnecting to server..."}>
      <span className={`relative flex h-2.5 w-2.5`}>
        {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
      </span>
      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
        {isConnected ? "Live" : "Offline"}
      </span>
    </div>
  );
}
