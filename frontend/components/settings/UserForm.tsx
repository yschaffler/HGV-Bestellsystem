import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Eye, EyeOff } from "lucide-react";
import type { User } from "@/app/settings/types";

export type UserFormProps = {
  initial?: Partial<User>;
  onSave: (u: Omit<User, "id">) => void;
  onCancel: () => void;
};

export function UserForm({ initial, onSave, onCancel }: UserFormProps) {
  const isEditing = !!initial?.username;

  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "KELLNER">(initial?.role ?? "KELLNER");
  const [changePassword, setChangePassword] = useState(!isEditing);

  const valid = username.trim().length > 0 && (!changePassword || password.trim().length > 0);

  function handleSave() {
    if (!valid) return;
    onSave({
      username: username.trim(),
      // Passwort nur mitschicken wenn es gesetzt/geändert wird
      password: changePassword ? password.trim() : (initial?.password ?? ""),
      role,
    });
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-4 mt-3">
      
      {/* Benutzername */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-name">Benutzername</Label>
        <Input
          id="user-name"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="z.B. max_mustermann"
        />
      </div>

      {/* Passwort Block */}
      {isEditing && !changePassword ? (
        // Editing-Modus: Passwort versteckt, Reset-Button sichtbar
        <div className="flex flex-col gap-1.5">
          <Label>Passwort</Label>
          <div className="flex items-center justify-between bg-muted/40 border rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="tracking-widest text-base">••••••••</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-3 rounded-lg font-medium"
              onClick={() => setChangePassword(true)}
            >
              Zurücksetzen
            </Button>
          </div>
        </div>
      ) : (
        // Erstellen oder Reset-Modus: Passwort-Input sichtbar
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="user-password">
              {isEditing ? "Neues Passwort" : "Passwort"}
            </Label>
            {/* Beim Bearbeiten: Abbrechen des Resets möglich */}
            {isEditing && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                onClick={() => { setChangePassword(false); setPassword(""); }}
              >
                Abbrechen
              </button>
            )}
          </div>

          {isEditing && (
            <p className="text-xs text-muted-foreground -mt-0.5">
              Das alte Passwort wird überschrieben.
            </p>
          )}

          <div className="relative">
            <Input
              id="user-password"
              autoFocus={isEditing} // Fokus nur wenn wir gerade den Reset öffnen
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Neues Passwort eingeben"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(prev => !prev)}
            >
              {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Rolle */}
      <div className="flex flex-col gap-1.5">
        <Label>Rolle</Label>
        <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "KELLNER")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="KELLNER">Kellner</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Aktionen */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Abbrechen
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={!valid}>
          <Check className="w-4 h-4 mr-1" /> Speichern
        </Button>
      </div>
    </div>
  );
}