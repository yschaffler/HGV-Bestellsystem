"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Pencil, Trash2, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import type { User, ApiUser } from "@/app/admin/types";

// ── Dialog ────────────────────────────────────────────────────────────────────

type DialogMode = { kind: "create" } | { kind: "edit"; user: User };

function UserDialog({
  mode,
  onClose,
  onSave,
}: {
  mode: DialogMode | null;
  onClose: () => void;
  onSave: (u: Omit<User, "id">, id?: string) => Promise<string | null>;
}) {
  const isEdit = mode?.kind === "edit";
  const initial = mode?.kind === "edit" ? mode.user : undefined;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "KELLNER" | "BAR">("KELLNER");
  const [changePassword, setChangePassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (!mode) return;
    setUsername(initial?.username ?? "");
    setPassword("");
    setShowPw(false);
    setRole(initial?.role ?? "KELLNER");
    setChangePassword(!isEdit);
    setError(null);
    setSavedCount(0);
    setTimeout(() => usernameRef.current?.focus(), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const valid = username.trim().length > 0 && (!changePassword || password.trim().length > 0);

  async function handleSave(andClose: boolean) {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const err = await onSave(
      { username: username.trim(), password: changePassword ? password.trim() : (initial?.password ?? ""), role },
      isEdit ? initial!.id : undefined,
    );
    setSaving(false);
    if (err) { setError(err); return; }
    if (andClose) { onClose(); return; }
    // Stay open — clear for next entry
    setUsername("");
    setPassword("");
    setChangePassword(true);
    setSavedCount(c => c + 1);
    setTimeout(() => usernameRef.current?.focus(), 50);
  }

  return (
    <Dialog open={!!mode} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Nutzer bearbeiten" : "Nutzer erstellen"}</DialogTitle>
        </DialogHeader>

        {savedCount > 0 && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {savedCount} Nutzer erfolgreich erstellt
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {/* Benutzername */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dlg-username">Benutzername</Label>
            <Input
              id="dlg-username"
              ref={usernameRef}
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave(!isEdit)}
              placeholder="z.B. max_mustermann"
            />
          </div>

          {/* Passwort */}
          {isEdit && !changePassword ? (
            <div className="flex flex-col gap-1.5">
              <Label>Passwort</Label>
              <div className="flex items-center justify-between bg-muted/40 border rounded-xl px-4 py-2.5">
                <span className="tracking-widest text-muted-foreground text-base">••••••••</span>
                <Button type="button" variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2.5 rounded-lg text-xs font-medium"
                  onClick={() => setChangePassword(true)}>
                  Zurücksetzen
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="dlg-password">{isEdit ? "Neues Passwort" : "Passwort"}</Label>
                {isEdit && (
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => { setChangePassword(false); setPassword(""); }}>
                    Abbrechen
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="dlg-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSave(!isEdit)}
                  placeholder="Passwort eingeben"
                  className="pr-10"
                />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw(v => !v)}>
                  {showPw ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Rolle */}
          <div className="flex flex-col gap-1.5">
            <Label>Rolle</Label>
            <Select value={role} onValueChange={v => setRole(v as "ADMIN" | "KELLNER" | "BAR")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KELLNER">Kellner</SelectItem>
                <SelectItem value="BAR">Bar</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          {!isEdit && (
            <Button variant="outline" onClick={() => handleSave(false)} disabled={!valid || saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Speichern & Weiteren"}
            </Button>
          )}
          <Button onClick={() => handleSave(true)} disabled={!valid || saving} className={isEdit ? "w-full" : "flex-1"}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Speichern" : "Fertig"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", KELLNER: "Kellner", BAR: "Bar" };
const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  KELLNER: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  BAR: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

export default function NutzerPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setIsLoading(true);
    try {
      const res = await fetch("/get/all-users/");
      if (!res.ok) throw new Error();
      const data: ApiUser[] = await res.json();
      setUsers(data.map(u => ({
        id: u.user_id.toString(),
        username: u.user_username,
        password: u.user_password,
        role: u.user_role,
      })));
    } catch {
      setPageError("Fehler beim Laden der Nutzer.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(u: Omit<User, "id">, id?: string): Promise<string | null> {
    const isEdit = !!id;
    try {
      const res = await fetch(isEdit ? "/update/user/" : "/add/user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: isEdit
          ? JSON.stringify({ user_id: parseInt(id!), user_username: u.username, user_password: u.password, user_role: u.role })
          : JSON.stringify({ user_username: u.username, user_password: u.password, user_role: u.role }),
      });
      if (res.status === 409) return "Benutzername bereits vergeben";
      if (!res.ok) throw new Error();
      await fetchUsers();
      return null;
    } catch {
      return isEdit ? "Fehler beim Speichern" : "Fehler beim Erstellen";
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch("/delete/user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: parseInt(deleteId) }),
      });
      if (!res.ok) throw new Error();
      setUsers(prev => prev.filter(u => u.id !== deleteId));
    } catch {
      setPageError("Löschen fehlgeschlagen");
    }
    setDeleteId(null);
  }

  const userToDelete = users.find(u => u.id === deleteId);

  return (
    <div>
      {/* Desktop sticky header */}
      <div className="hidden md:flex sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Nutzer</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Accounts, Rollen und Passwörter verwalten</p>
        </div>
        <Button size="sm" onClick={() => setDialogMode({ kind: "create" })}>
          <PlusCircle className="w-4 h-4 mr-2" /> Nutzer erstellen
        </Button>
      </div>

      {/* Mobile action bar */}
      <div className="md:hidden flex items-center justify-end px-4 py-3 border-b">
        <Button size="sm" onClick={() => setDialogMode({ kind: "create" })}>
          <PlusCircle className="w-4 h-4 mr-2" /> Nutzer erstellen
        </Button>
      </div>

      {pageError && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm font-semibold text-center">
          {pageError}
        </div>
      )}

      <div className="px-4 md:px-6 py-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm opacity-60 mb-4">Noch keine Nutzer angelegt</p>
            <Button variant="outline" onClick={() => setDialogMode({ kind: "create" })}>
              <PlusCircle className="w-4 h-4 mr-2" /> Ersten Nutzer erstellen
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left font-semibold text-muted-foreground px-4 py-3">Benutzername</th>
                  <th className="text-left font-semibold text-muted-foreground px-4 py-3">Rolle</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLOR[u.role] ?? ""}`}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => setDialogMode({ kind: "edit", user: u })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteId(u.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserDialog
        mode={dialogMode}
        onClose={() => setDialogMode(null)}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nutzer löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{userToDelete?.username}</strong> wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={confirmDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
