import React, { useState } from "react";
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
  Shield,
  Camera,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  { label: "Coordenadores", icon: Shield, path: "/coordenadores" },
  { label: "Integrações", icon: Settings, path: "/integracoes" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["current_user"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

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
      <div className="p-2 border-t border-border space-y-3">
        {/* User Profile */}
        {user && (
          <button
            onClick={() => setOpenEditProfile(true)}
            className="flex items-center gap-3 w-full hover:opacity-70 transition-opacity"
          >
            <img
              src={user.avatar_url || "https://via.placeholder.com/40"}
              alt={user.full_name}
              className="w-10 h-10 rounded-lg object-cover"
            />
            {!collapsed && (
              <p className="text-sm font-semibold text-foreground truncate flex-1 text-left">
                {user.full_name || "Usuário"}
              </p>
            )}
          </button>
        )}

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-lg p-6 w-96 shadow-lg space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Editar Perfil</h2>

        {/* Photo */}
        <div className="flex flex-col items-center gap-3">
          <img
            src={user.avatar_url || "https://via.placeholder.com/80"}
            alt={user.full_name}
            className="w-20 h-20 rounded-lg object-cover"
          />
          <label className="text-sm text-primary cursor-pointer hover:underline">
            {uploading ? "Enviando..." : "Alterar foto"}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-3 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}