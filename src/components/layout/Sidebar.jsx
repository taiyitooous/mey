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
  Trophy,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Atividades", icon: Activity, path: "/atividades" },
  { label: "Leaderboard", icon: Trophy, path: "/leaderboard" },
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
    <>
      {/* Floating Sidebar */}
      <aside className="fixed left-3 top-1/2 -translate-y-1/4 z-40 flex flex-col items-center gap-1 bg-card/90 backdrop-blur-md border border-border rounded-2xl py-3 px-1.5 shadow-2xl">
        {/* Logo */}
        <div className="mb-2 px-1">
          <img
            src="https://media.base44.com/images/public/user_68fbb6f1a06149abf6635095/ff0e387d5_image.png"
            alt="MEY"
            className="w-8 h-8 rounded-lg object-cover"
          />
        </div>

        <div className="w-6 h-px bg-border mb-1" />

        {/* Nav */}
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
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                } ${isHovered && !isActive ? "scale-110" : ""}`}
              />
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover border border-border text-foreground text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                {item.label}
              </span>
            </Link>
          );
        })}

        <div className="w-6 h-px bg-border mt-1 mb-1" />

        {/* User */}
        {user && (
          <button
            onClick={() => setOpenEditProfile(true)}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted/70 transition-all duration-200 group"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
            )}
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover border border-border text-foreground text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
              {user.full_name || "Perfil"}
            </span>
          </button>
        )}

        {/* Logout */}
        <button
          onClick={() => base44.auth.logout()}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4" />
          <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover border border-border text-foreground text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
            Sair
          </span>
        </button>
      </aside>

      {/* Edit Profile Dialog */}
      {openEditProfile && user && (
        <EditProfileDialog user={user} onClose={() => setOpenEditProfile(false)} />
      )}
    </>
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