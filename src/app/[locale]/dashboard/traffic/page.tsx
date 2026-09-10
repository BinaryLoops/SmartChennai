"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSocket } from "@/hooks/useSocket";
import Link from "next/link";
import { motion } from "framer-motion";
import { CCTVGrid } from "@/components/cctv/CCTVGrid";

interface InitialJunction {
  id: string;
  name: string;
  zoneId: string;
  vehiclesPerHour: number;
  avgSpeed: number;
  congestionLevel: number;
}

interface Zone {
  id: string;
  name: string;
}

interface CameraData {
  id: string;
  junctionId: string;
  junctionName: string;
  zoneName: string;
  lat: number;
  lng: number;
  status: string;
}

export default function TrafficDashboardPage() {
  const t = useTranslations("traffic");
  const tc = useTranslations("cctv");
  const socket = useSocket();

  const [initialJunctions, setInitialJunctions] = useState<InitialJunction[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"table" | "cctv">("table");

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "congestion",
    direction: "desc",
  });
  const [filterZone, setFilterZone] = useState<string>("all");

  useEffect(() => {
    fetch("/api/dashboard/initial")
      .then((res) => res.json())
      .then((data) => {
        setInitialJunctions(data.junctions);
        setZones(data.zones);
        setCameras(data.cameras || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load traffic data:", err);
        setLoading(false);
      });
  }, []);

  const zoneMap = useMemo(() => {
    return new Map(zones.map((z) => [z.id, z.name]));
  }, [zones]);

  const junctions = useMemo(() => {
    return initialJunctions.map((j) => {
      const liveData = socket.trafficByJunction.get(j.id);
      return {
        id: j.id,
        name: j.name,
        zoneName: zoneMap.get(j.zoneId) || j.zoneId,
        zoneId: j.zoneId,
        vehiclesPerHour: liveData?.vehiclesPerHour ?? j.vehiclesPerHour,
        avgSpeed: liveData?.avgSpeedKph ?? j.avgSpeed,
        congestionLevel: liveData?.congestionLevel ?? j.congestionLevel,
      };
    });
  }, [initialJunctions, socket.trafficByJunction, zoneMap]);

  const filteredJunctions = useMemo(() => {
    let result = junctions;
    if (filterZone !== "all") {
      result = result.filter((j) => j.zoneId === filterZone);
    }

    result.sort((a, b) => {
      let aVal: number | string = a.name;
      let bVal: number | string = b.name;

      switch (sortConfig.key) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "zone":
          aVal = a.zoneName;
          bVal = b.zoneName;
          break;
        case "vph":
          aVal = a.vehiclesPerHour;
          bVal = b.vehiclesPerHour;
          break;
        case "speed":
          aVal = a.avgSpeed;
          bVal = b.avgSpeed;
          break;
        case "congestion":
          aVal = a.congestionLevel;
          bVal = b.congestionLevel;
          break;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [junctions, filterZone, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center">
        <div className="skeleton h-[400px] w-full max-w-5xl rounded-card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">
          {t("trafficCommand")}
        </h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-text-muted">{t("filterZone")}:</label>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="rounded-lg border border-border bg-base px-3 py-1.5 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
          >
            <option value="all">{t("allZones")}</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("table")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === "table"
              ? "text-accent-cyan"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {tc("junctionTab")}
          {activeTab === "table" && (
            <motion.div
              layoutId="traffic-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-cyan"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("cctv")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === "cctv"
              ? "text-accent-cyan"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          📹 {tc("cctvTab")}
          {activeTab === "cctv" && (
            <motion.div
              layoutId="traffic-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-cyan"
            />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "table" ? (
        <div className="overflow-hidden rounded-card border border-border bg-base-elevated shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-secondary">
              <thead className="sticky top-0 bg-base-card text-xs uppercase text-text-muted">
                <tr>
                  <SortableHeader label={t("junction")} sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label={t("zone")} sortKey="zone" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label={t("vph")} sortKey="vph" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label={t("speed")} sortKey="speed" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label={t("congestion")} sortKey="congestion" currentSort={sortConfig} onSort={handleSort} />
                  <th className="px-6 py-4">{t("status")}</th>
                  <th className="px-6 py-4 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredJunctions.map((j) => {
                  const congPercent = Math.round(j.congestionLevel * 100);
                  let statusColor = "text-accent-green";
                  let statusText = t("statusNormal");
                  if (congPercent > 80) {
                    statusColor = "text-accent-red";
                    statusText = t("statusCritical");
                  } else if (congPercent > 60) {
                    statusColor = "text-accent-amber";
                    statusText = t("statusWarning");
                  }

                  return (
                    <motion.tr
                      key={j.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group border-b border-border transition-colors hover:bg-accent-cyan/5"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-text-primary">
                        {j.name}
                      </td>
                      <td className="px-6 py-4">{j.zoneName}</td>
                      <td className="px-6 py-4 font-mono">{j.vehiclesPerHour}</td>
                      <td className="px-6 py-4 font-mono">{Math.round(j.avgSpeed)} km/h</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8 font-mono">{congPercent}%</span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-base">
                            <div
                              className={`h-full ${
                                congPercent > 80 ? "bg-accent-red" : congPercent > 60 ? "bg-accent-amber" : "bg-accent-cyan"
                              }`}
                              style={{ width: `${congPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 font-semibold ${statusColor}`}>
                        {statusText}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActiveTab("cctv")}
                            className="rounded-md border border-border bg-base px-2 py-1.5 text-xs text-text-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan"
                            title="View CCTV"
                          >
                            📹
                          </button>
                          <Link
                            href={`/dashboard/traffic/${j.id}`}
                            className="rounded-md border border-border bg-base px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
                          >
                            {t("manage")}
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filteredJunctions.length === 0 && (
              <div className="px-6 py-8 text-center text-text-muted">
                {t("noJunctionsFound")}
              </div>
            )}
          </div>
        </div>
      ) : (
        <CCTVGrid
          cameras={cameras}
          zones={zones}
          trafficByJunction={socket.trafficByJunction}
          incidents={socket.incidents}
          filterZone={filterZone}
          onFilterZoneChange={setFilterZone}
        />
      )}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: "asc" | "desc" };
  onSort: (key: string) => void;
}) {
  const active = currentSort.key === sortKey;
  return (
    <th
      className="cursor-pointer px-6 py-4 transition-colors hover:text-text-primary"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <span className={`text-[10px] ${active ? "text-accent-cyan" : "text-transparent"}`}>
          {currentSort.direction === "asc" ? "▲" : "▼"}
        </span>
      </div>
    </th>
  );
}
