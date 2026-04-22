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
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "KELLNER">(initial?.role ?? "KELLNER");

  const valid = username.trim().length > 0 && password.trim().length > 0;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-4 mt-3">
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-password">Passwort</Label>
        <div className="relative">
          <Input
            id="user-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
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
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Abbrechen
        </Button>
        <Button className="flex-1" onClick={() => valid && onSave({ username: username.trim(), password: password.trim(), role })} disabled={!valid}>
          <Check className="w-4 h-4 mr-1" /> Speichern
        </Button>
      </div>
    </div>
  );
}
