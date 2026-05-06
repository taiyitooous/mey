import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import GlobalHeader from "./GlobalHeader";
import { GlobalFiltersProvider } from "@/lib/GlobalFilters";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWavoipListener } from "@/hooks/useWavoipListener";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const { data: wavoipDevices = [] } = useQuery({
    queryKey: ["wavoipDevices"],
    queryFn: () => base44.entities.WavoipConfig.filter({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  useWavoipListener(wavoipDevices);

  return (
    <GlobalFiltersProvider>
      <div className="min-h-screen bg-background">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <main className="ml-[72px]">
          <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
            <GlobalHeader />
            <Outlet />
          </div>
        </main>
      </div>
    </GlobalFiltersProvider>
  );
}