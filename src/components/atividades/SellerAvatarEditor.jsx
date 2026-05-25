import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Pencil, Check, X } from "lucide-react";

export default function SellerAvatarEditor({ sellerKey, displayName, avatarUrl, onUpdated, size = "md" }) {
  const fileRef = useRef();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(displayName || sellerKey);
  const [uploading, setUploading] = useState(false);

  const sizeClass = size === "lg" ? "w-16 h-16 rounded-2xl text-xl" : size === "xs" ? "w-7 h-7 rounded-full text-xs" : "w-11 h-11 rounded-full text-sm";
  const initials = (displayName || sellerKey).split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await upsertConfig({ avatar_url: file_url });
    setUploading(false);
  }

  async function upsertConfig(patch) {
    const existing = await base44.entities.SellerConfig.filter({ seller_key: sellerKey });
    if (existing.length > 0) {
      await base44.entities.SellerConfig.update(existing[0].id, patch);
    } else {
      await base44.entities.SellerConfig.create({ seller_key: sellerKey, ...patch });
    }
    onUpdated?.();
  }

  async function saveName() {
    await upsertConfig({ display_name: nameInput });
    setEditing(false);
  }

  // Para size="xs" e size="sm", só renderizar o avatar (sem nome/edição)
  if (size === "xs" || size === "sm") {
    return (
      <div className="relative group shrink-0">
        <div
          className={`${sizeClass} flex items-center justify-center font-bold bg-primary/10 text-primary overflow-hidden cursor-pointer`}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div
          className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="w-3 h-3 text-white" />
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Avatar with upload */}
      <div className="relative group shrink-0">
        <div
          className={`${sizeClass} flex items-center justify-center font-bold bg-primary/10 text-primary overflow-hidden cursor-pointer`}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div
          className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="w-4 h-4 text-white" />
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </div>

      {/* Name + edit */}
      <div className="min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="text-sm font-bold border border-primary rounded px-1.5 py-0.5 w-32 bg-background"
            />
            <button onClick={saveName} className="text-success hover:opacity-70"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditing(false)} className="text-muted-foreground hover:opacity-70"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group/name">
            <p className={`font-bold truncate ${size === "lg" ? "text-lg" : "text-sm"}`}>{displayName || sellerKey}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="opacity-0 group-hover/name:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}