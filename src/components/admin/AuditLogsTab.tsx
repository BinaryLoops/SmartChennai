"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export default function AuditLogsTab() {
  const t = useTranslations("admin");
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [search]);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/audit-logs?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <input 
          type="text"
          placeholder={t("searchLogs")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border bg-base-elevated px-4 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan w-full sm:w-64"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-base-card">
        <table className="w-full text-left text-sm text-text-secondary">
          <thead className="border-b border-border bg-base-elevated uppercase text-text-muted text-xs">
            <tr>
              <th className="px-6 py-4">{t("timestamp")}</th>
              <th className="px-6 py-4">{t("action")}</th>
              <th className="px-6 py-4">{t("actor")}</th>
              <th className="px-6 py-4">{t("details")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={4} className="p-6 text-center text-text-muted">Loading...</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-base-elevated transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4 font-medium text-text-primary">{log.actionType}</td>
                <td className="px-6 py-4 font-mono text-xs text-accent-cyan">{log.operatorId || "System"}</td>
                <td className="px-6 py-4">
                  <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs text-text-muted" title={JSON.stringify(log.newValues)}>
                    {log.newValues ? JSON.stringify(log.newValues) : "-"}
                  </div>
                </td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr><td colSpan={4} className="p-6 text-center text-text-muted">No logs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
