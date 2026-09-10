"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import UsersTab from "@/components/admin/UsersTab";
import AuditLogsTab from "@/components/admin/AuditLogsTab";
import SystemConfigTab from "@/components/admin/SystemConfigTab";

type TabId = "users" | "auditLogs" | "systemConfig";

export default function AdminDashboard() {
  const t = useTranslations("admin");
  const [activeTab, setActiveTab] = useState<TabId>("users");

  const tabs: { id: TabId; label: string }[] = [
    { id: "users", label: t("users") },
    { id: "auditLogs", label: t("auditLogs") },
    { id: "systemConfig", label: t("systemConfig") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage users, monitor audit logs, and configure system parameters.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-xl bg-base-card p-1 max-w-fit border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-base-elevated text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "users" && <UsersTab />}
        {activeTab === "auditLogs" && <AuditLogsTab />}
        {activeTab === "systemConfig" && <SystemConfigTab />}
      </div>
    </div>
  );
}
