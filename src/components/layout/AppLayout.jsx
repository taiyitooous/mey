import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import GlobalHeader from "./GlobalHeader";
import { GlobalFiltersProvider } from "@/lib/GlobalFilters";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <GlobalFiltersProvider>
      <div className="min-h-screen bg-background">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <main
          className={`transition-all duration-300 ${
            collapsed ? "ml-[72px]" : "ml-[240px]"
          }`}
        >
          <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
            <GlobalHeader />
            <Outlet />
          </div>
        </main>
      </div>
    </GlobalFiltersProvider>
  );
}