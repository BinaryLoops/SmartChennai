import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { cookies } from "next/headers";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const role = cookies().get("user_role")?.value || "operator";
  return (
    <div className="flex">
      <Sidebar role={role} />
      <div className="flex-1">
        <Topbar />
        <main className="p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
