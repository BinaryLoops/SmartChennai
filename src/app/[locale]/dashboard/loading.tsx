"use client";

export default function DashboardLoading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center space-y-4">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-accent-cyan/20 border-t-accent-cyan animate-spin"></div>
      </div>
      <p className="text-sm font-medium text-text-muted animate-pulse uppercase tracking-widest">
        Loading...
      </p>
    </div>
  );
}
