"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";

export default function UsersTab() {
  const t = useTranslations("admin");
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "", email: "", role: "citizen", department: ""
  });

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentStatus })
    });
    fetchUsers();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowAddForm(false);
      setFormData({ name: "", email: "", role: "citizen", department: "" });
      fetchUsers();
    } else {
      alert("Error creating user");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <input 
          type="text"
          placeholder={t("searchUsers")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border bg-base-elevated px-4 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan w-full sm:w-64"
        />
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-lg bg-accent-cyan px-4 py-2 text-sm font-medium text-base hover:bg-cyan-500"
        >
          {t("addUser")}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-base-elevated p-6 space-y-4">
          <h3 className="text-lg font-medium text-text-primary">{t("createUser")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required type="text" placeholder={t("name")} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="rounded-lg border border-border bg-base-card px-4 py-2 text-sm text-text-primary" />
            <input required type="email" placeholder={t("email")} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="rounded-lg border border-border bg-base-card px-4 py-2 text-sm text-text-primary" />
            <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="rounded-lg border border-border bg-base-card px-4 py-2 text-sm text-text-primary">
              <option value="citizen">Citizen</option>
              <option value="operator">Operator</option>
              <option value="dept_head">Dept Head</option>
              <option value="dm">DM</option>
              <option value="commissioner">Commissioner</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <input type="text" placeholder={t("department")} value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="rounded-lg border border-border bg-base-card px-4 py-2 text-sm text-text-primary" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary">{t("cancel")}</button>
            <button type="submit" className="rounded-lg bg-accent-cyan px-4 py-2 text-sm font-medium text-base hover:bg-cyan-500">{t("save")}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-base-card">
        <table className="w-full text-left text-sm text-text-secondary">
          <thead className="border-b border-border bg-base-elevated uppercase text-text-muted text-xs">
            <tr>
              <th className="px-6 py-4">{t("name")}</th>
              <th className="px-6 py-4">{t("email")}</th>
              <th className="px-6 py-4">{t("role")}</th>
              <th className="px-6 py-4">{t("status")}</th>
              <th className="px-6 py-4 text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-text-muted">Loading...</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-base-elevated transition-colors">
                <td className="px-6 py-4 font-medium text-text-primary">{user.name}</td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4 uppercase text-xs tracking-wider">{user.role}</td>
                <td className="px-6 py-4">
                  <span className={clsx("rounded-full px-2 py-1 text-xs font-semibold", user.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                    {user.isActive ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => toggleStatus(user.id, user.isActive)}
                    className="text-accent-cyan hover:text-cyan-400 font-medium"
                  >
                    {user.isActive ? t("deactivate") : t("reactivate")}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr><td colSpan={5} className="p-6 text-center text-text-muted">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
