"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Users,
  Printer,
  BarChart3,
  Archive,
} from "lucide-react";

type NavTile = {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  color: string;
};

const tiles: NavTile[] = [
  {
    icon: <UtensilsCrossed className="w-5 h-5" />,
    label: "Produkte & Kategorien",
    description: "Artikel, Preise und Produktgruppen",
    href: "/settings/produkte",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: <Users className="w-5 h-5" />,
    label: "Nutzer",
    description: "Accounts, Rollen und Passwörter",
    href: "/settings/nutzer",
    color: "bg-violet-500/10 text-violet-500",
  },
  {
    icon: <Printer className="w-5 h-5" />,
    label: "Drucker",
    description: "Regeln, Routen und Warteschlangen",
    href: "/settings/drucker",
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    label: "Statistiken",
    description: "Umsatz, Kellner, Kategorien & Reset",
    href: "/admin/statistiken",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: <Archive className="w-5 h-5" />,
    label: "Event-Archiv",
    description: "Vergangene Events & PDF-Export",
    href: "/admin/events",
    color: "bg-rose-500/10 text-rose-500",
  },
];

export default function SettingsHub() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => router.push("/")}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Einstellungen</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Adminbereich
          </p>
        </div>
      </div>

      {/* Tile list */}
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-2">
        {tiles.map((tile) => (
          <button
            key={tile.href}
            onClick={() => router.push(tile.href)}
            className="w-full flex items-center gap-4 bg-card border border-border rounded-2xl px-4 py-4 hover:bg-muted/40 active:scale-[0.98] transition-all text-left"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tile.color}`}>
              {tile.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-[15px] leading-tight">{tile.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tile.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
