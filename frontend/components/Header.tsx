"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

type HeaderProps = {
  waiterId: string;
  table?: number | null;
  onLogout: () => void;
};

export function Header({ waiterId, table, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-md mx-auto items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">
            Kellner: <span className="text-primary">{waiterId}</span>
          </div>
          {table && (
            <>
              <span className="text-muted-foreground">|</span>
              <div className="font-semibold text-sm">
                Tisch: <span className="text-primary">{table}</span>
              </div>
            </>
          )}
        </div>

        <Button variant="ghost" size="icon" onClick={onLogout} title="Abmelden">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
