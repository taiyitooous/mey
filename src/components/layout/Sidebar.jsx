import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Truck,
  Phone,
  ScrollText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Activity,
  Settings,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Hoje", icon: CalendarCheck, path: "/hoje" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Vendas", icon: Users, path: "/vendas" },
  { label: "Logística", icon: Truck, path: "/logistica" },
  { label: "Cobrança", icon: Phone, path: "/cobranca" },
  { label: "Atividades", icon: Activity, path: "/atividades" },
  { label: "Eventos", icon: ScrollText, path: "/eventos" },
  { label: "Integrações", icon: Settings, path: "/integracoes" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen flex flex-col bg-card border-r border-border transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <img
          src="https://media.base44.com/images/public/user_68fbb6f1a06149abf6635095/ff0e387d5_image.png"
          alt="MEY"
          className="w-9 h-9 rounded-lg object-cover"
        />
        {!collapsed && (
          <span className="text-xl font-bold tracking-tight text-foreground">
            MEY
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center text-muted-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </aside>
  );
}