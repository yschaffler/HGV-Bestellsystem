"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Users,
  Printer,
  BarChart3,
  Archive,
  Menu,
  ChevronLeft,
  Settings2,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
};

const NAV_SETTINGS: NavItem[] = [
  { icon: UtensilsCrossed, label: "Produkte & Kategorien", href: "/admin/produkte", color: "text-blue-500" },
  { icon: Users,           label: "Nutzer",                 href: "/admin/nutzer",   color: "text-violet-500" },
  { icon: Printer,         label: "Drucker",                href: "/admin/drucker",  color: "text-amber-500" },
];

const NAV_ADMIN: NavItem[] = [
  { icon: BarChart3, label: "Statistiken",  href: "/admin/statistiken", color: "text-emerald-500" },
  { icon: Archive,   label: "Event-Archiv", href: "/admin/events",      color: "text-rose-500" },
];

const ALL_NAV = [...NAV_SETTINGS, ...NAV_ADMIN];

function NavGroup({ label, icon: GroupIcon, items, pathname, onClose }: {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2">
        <GroupIcon className="w-3 h-3 text-muted-foreground/60" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</span>
      </div>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} onClick={onClose}>
            <span className={cn(
              "flex items-center gap-3 rounded-xl mx-2 px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}>
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : item.color)} />
              <span className="truncate">{item.label}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function SidebarBody({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Settings2 className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Admin</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Bestellsystem</p>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1 py-3">
        <NavGroup
          label="Einstellungen"
          icon={Settings2}
          items={NAV_SETTINGS}
          pathname={pathname}
          onClose={onClose}
        />
        <div className="my-2 mx-4"><Separator /></div>
        <NavGroup
          label="Auswertung"
          icon={LineChart}
          items={NAV_ADMIN}
          pathname={pathname}
          onClose={onClose}
        />
      </ScrollArea>

      <Separator />

      <div className="p-3 shrink-0">
        <button
          onClick={() => { onClose?.(); router.push("/"); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          Zurück zur App
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const currentItem = ALL_NAV.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r">
        <SidebarBody pathname={pathname} />
      </aside>

      {/* ── Right column ────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-2 border-b px-3 py-2.5 bg-background shrink-0">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl w-9 h-9 shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarBody pathname={pathname} onClose={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 min-w-0">
            {currentItem && (
              <currentItem.icon className={cn("w-4 h-4 shrink-0", currentItem.color)} />
            )}
            <span className="font-semibold text-sm truncate">
              {currentItem?.label ?? "Admin"}
            </span>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
