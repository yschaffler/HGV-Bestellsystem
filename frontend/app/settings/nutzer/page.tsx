"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { User, DeleteDialog, ApiUser } from "@/app/settings/types";
import { UserForm } from "@/components/settings/UserForm";
import { UserRow } from "@/components/settings/UserRow";
import { DeleteConfirmDialog } from "@/components/settings/DeleteConfirmDialog";

export default function NutzerPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setIsLoading(true);
    try {
      const res = await fetch("/get/all-users/");
      if (!res.ok) throw new Error();
      const userData: ApiUser[] = await res.json();
      setUsers(userData.map(u => ({
        id: u.user_id.toString(),
        username: u.user_username,
        password: u.user_password,
        role: u.user_role,
      })));
    } catch {
      setError("Fehler beim Laden der Nutzer.");
    } finally {
      setIsLoading(false);
    }
  }

  async function addUser(u: Omit<User, "id">) {
    setError(null);
    try {
      const res = await fetch("/add/user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_username: u.username, user_password: u.password, user_role: u.role }),
      });
      if (res.status === 409) { setError("Benutzername bereits vergeben"); return; }
      if (!res.ok) throw new Error();
      setShowAddUser(false);
      await fetchUsers();
    } catch {
      setError("Fehler beim Speichern des Nutzers");
    }
  }

  async function updateUser(updated: User) {
    setError(null);
    try {
      const res = await fetch("/update/user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: parseInt(updated.id), user_username: updated.username, user_password: updated.password, user_role: updated.role }),
      });
      if (res.status === 409) { setError("Benutzername bereits vergeben"); return; }
      if (!res.ok) throw new Error();
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch {
      setError("Fehler beim Updaten des Nutzers");
    }
  }

  async function confirmDelete() {
    if (!deleteDialog || deleteDialog.type !== "user") return;
    setError(null);
    try {
      const res = await fetch("/delete/user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: parseInt(deleteDialog.id) }),
      });
      if (!res.ok) throw new Error();
      setUsers(prev => prev.filter(u => u.id !== deleteDialog.id));
    } catch {
      setError("Löschen fehlgeschlagen");
    }
    setDeleteDialog(null);
  }

  return (
    <TooltipProvider>
      <div className="min-h-full">
        {/* Desktop page title */}
        <div className="hidden md:block px-6 pt-6 pb-2">
          <h1 className="text-xl font-bold tracking-tight">Nutzer</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Accounts, Rollen und Passwörter verwalten</p>
        </div>

        {error && (
          <div className="bg-destructive text-destructive-foreground px-4 py-2 font-bold text-center">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 flex flex-col gap-3">
            {users.length === 0 && !showAddUser && (
              <p className="py-10 text-center text-muted-foreground text-sm opacity-50">Noch keine Nutzer angelegt</p>
            )}

            {users.map(u => (
              <UserRow
                key={u.id}
                user={u}
                onUpdate={updateUser}
                onRequestDelete={(id, name) => setDeleteDialog({ type: "user", id, name })}
              />
            ))}

            {showAddUser ? (
              <UserForm onSave={addUser} onCancel={() => setShowAddUser(false)} />
            ) : (
              <Button variant="outline" className="w-full border-dashed" onClick={() => setShowAddUser(true)}>
                <PlusCircle className="w-4 h-4 mr-2" /> Nutzer hinzufügen
              </Button>
            )}
          </div>
        )}

        <DeleteConfirmDialog
          dialog={deleteDialog}
          onOpenChange={open => !open && setDeleteDialog(null)}
          onConfirm={confirmDelete}
        />
      </div>
    </TooltipProvider>
  );
}
