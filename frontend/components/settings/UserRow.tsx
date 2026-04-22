import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { UserForm } from "@/components/settings/UserForm";
import type { User } from "@/app/settings/types";

export type UserRowProps = {
  user: User;
  onUpdate: (u: User) => void;
  onRequestDelete: (id: string, name: string) => void;
};

export function UserRow({ user, onUpdate, onRequestDelete }: UserRowProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <UserForm
        initial={user}
        onSave={(updated) => {
          onUpdate({ ...updated, id: user.id });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{user.username}</p>
        <p className="text-xs text-muted-foreground">{"•".repeat(8)}</p>
      </div>
      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="shrink-0">
        {user.role}
      </Badge>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-primary/10 hover:text-primary" onClick={() => setEditing(true)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => onRequestDelete(user.id, user.username)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
