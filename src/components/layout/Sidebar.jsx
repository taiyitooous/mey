import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  ScrollText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  Settings,
  Shield,
  Database,
  User,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Atividades", icon: Activity, path: "/atividades" },
  { label: "DataCrazy", icon: Database, path: "/datacrazy" },
  { label: "Eventos", icon: ScrollText, path: "/eventos" },
  { label: "Coordenadores", icon: Shield, path: "/coordenadores" },
  { label: "Integrações", icon: Settings, path: "/integracoes" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [hoveredPath, setHoveredPath] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["current_user"],
    queryFn: async () => {
      try { return await base44.auth.me(); } catch { return null; }
    },
  });

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out ${
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
          <span className="text-xl font-bold tracking-tight text-foreground">MEY</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const isHovered = hoveredPath === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onMouseEnter={() => setHoveredPath(item.path)}
              onMouseLeave={() => setHoveredPath(null)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group overflow-hidden ${
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}

              <item.icon
                className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                } ${isHovered && !isActive ? "scale-110" : ""}`}
              />

              {!collapsed && (
                <span className="transition-opacity duration-200">{item.label}</span>
              )}

              {/* Tooltip when collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover border border-border text-foreground text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1">
        {/* User Profile */}
        {user && (
          <button
            onClick={() => setOpenEditProfile(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/70 transition-all duration-200 group"
          >
            <div className="relative shrink-0">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-8 h-8 rounded-lg object-cover ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-200">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
            </div>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.full_name || "Usuário"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full group"
        >
          <LogOut className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
          {!collapsed && <span>Sair</span>}
          {collapsed && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover border border-border text-foreground text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
              Sair
            </span>
          )}
        </button>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all duration-200"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Edit Profile Dialog */}
      {openEditProfile && user && (
        <EditProfileDialog user={user} onClose={() => setOpenEditProfile(false)} />
      )}
    </aside>
  );
}

function EditProfileDialog({ user, onClose }) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ avatar_url: file_url });
      queryClient.invalidateQueries({ queryKey: ["current_user"] });
      onClose();
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-xl p-6 w-80 shadow-2xl border border-border space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">Editar Perfil</h2>
        <div className="flex flex-col items-center gap-3">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-20 h-20 rounded-xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold">{user.full_name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <label className="text-sm text-primary cursor-pointer hover:underline">
            {uploading ? "Enviando..." : "Alterar foto"}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
        <button
          onClick={onClose}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}