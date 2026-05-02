"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

type HeaderProps = {
  waiterId: string;
  table?: number | null;
  onLogout: () => void;
};

export function Header({ waiterId, table, onLogout }: HeaderProps) {
  const router = useRouter()
  return (
    <header className="sticky top-0 z-50 w-full shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-md mx-auto items-center justify-between px-4">
        <Button variant="ghost" className="w-10 h-10 p-0 mr-2 rounded-full" onClick={() => router.push("/")}>
            <ChevronLeft className="w-6 h-6" />
        </Button>
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
