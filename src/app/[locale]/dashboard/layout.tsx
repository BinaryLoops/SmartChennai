import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { cookies } from "next/headers";
import { LiveEventStream } from "@/components/dashboard/extended/LiveEventStream";
import { ScenarioControlPanel } from "@/components/dashboard/extended/ScenarioControlPanel";

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
        <LiveEventStream />
        <ScenarioControlPanel />
      </div>
    </div>
  );
}
