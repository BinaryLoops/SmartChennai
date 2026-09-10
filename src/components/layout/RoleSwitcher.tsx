"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RoleSwitcher() {
  const router = useRouter();
  const [role, setRole] = useState("operator");

  useEffect(() => {
    const match = document.cookie.match(/(^| )user_role=([^;]+)/);
    if (match) {
      setRole(match[2]);
    } else {
      document.cookie = "user_role=operator; path=/";
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    document.cookie = `user_role=${newRole}; path=/`;
    setRole(newRole);
    // Reload to apply middleware rules
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <label className="text-xs text-text-muted">Role:</label>
      <select
        value={role}
        onChange={handleChange}
        className="rounded-md border border-border bg-base px-2 py-1 text-xs text-text-primary focus:border-accent-cyan focus:outline-none"
      >
        <option value="operator">Operator</option>
        <option value="dm">District Magistrate</option>
        <option value="commissioner">Commissioner</option>
        <option value="dept_head">Dept Head</option>
        <option value="super_admin">Super Admin</option>
      </select>
    </div>
  );
}
