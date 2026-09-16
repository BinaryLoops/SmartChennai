import { LanguageSwitcher } from "./LanguageSwitcher";
import { RoleSwitcher } from "./RoleSwitcher";
import { DemoModeSwitcher } from "./DemoModeSwitcher";
import { ConnectionStatus } from "./ConnectionStatus";
import { ZoneIntelligence } from "../dashboard/extended/ZoneIntelligence";
import { DemoIndicator } from "../dashboard/extended/DemoIndicator";

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-base-elevated px-6 print:hidden">
      <p className="text-sm font-medium text-text-primary">Smart Chennai ICCC</p>
      <div className="flex items-center gap-4">
        <DemoIndicator />
        <ZoneIntelligence />
        <ConnectionStatus />
        <DemoModeSwitcher />
        <RoleSwitcher />
        <LanguageSwitcher />
        <div className="h-8 w-8 rounded-full bg-base-card" aria-hidden="true" />
      </div>
    </header>
  );
}
