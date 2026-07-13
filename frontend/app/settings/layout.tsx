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
  Settings,
  ChevronLeft,
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
  SheetClose,
} from "@/components/ui/sheet";

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
  external?: boolean;
};

const NAV: NavItem[] = [
  {
    icon: UtensilsCrossed,
    label: "Produkte & Kategorien",
    href: "/settings/produkte",
    color: "text-blue-500",
  },
  {
    icon: Users,
    label: "Nutzer",
    href: "/settings/nutzer",
    color: "text-violet-500",
  },
  {
    icon: Printer,
    label: "Drucker",
    href: "/settings/drucker",
    color: "text-amber-500",
  },
  {
    icon: BarChart3,
    label: "Statistiken",
    href: "/admin/statistiken",
    color: "text-emerald-500",
    external: true,
  },
  {
    icon: Archive,
    label: "Event-Archiv",
    href: "/admin/events",
    color: "text-rose-500",
    external: true,
  },
];

function NavList({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {NAV.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        const inner = (
          <span
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : item.color)}
            />
            <span className="truncate">{item.label}</span>
            {item.external && !isActive && (
              <span className="ml-auto text-[10px] opacity-40 font-normal">↗</span>
            )}
          </span>
        );

        return (
          <Link key={item.href} href={item.href} onClick={onClose}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold leading-tight">Einstellungen</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Adminbereich
            </p>
          </div>
        </button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 py-4">
        <NavList pathname={pathname} />
      </ScrollArea>

      <Separator />

      <div className="p-3">
        <button
          onClick={() => router.push("/")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Zurück zur Startseite
        </button>
      </div>
    </div>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const currentItem = NAV.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Desktop sidebar ────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 border-b px-4 py-3 bg-background/95 backdrop-blur sticky top-0 z-20">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarContent pathname={pathname} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 min-w-0">
            {currentItem && (
              <currentItem.icon className={cn("w-4 h-4 shrink-0", currentItem.color)} />
            )}
            <span className="font-semibold text-sm truncate">
              {currentItem?.label ?? "Einstellungen"}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
