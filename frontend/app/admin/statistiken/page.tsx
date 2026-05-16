"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChevronLeft,
  Loader2,
  Receipt,
  RefreshCcw,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Tag,
  TableProperties,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type RechnungPosition = {
  product_id: number;
  name: string;
  amount: number;
  price: number;
  kategorie: string;
};

type Rechnung = {
  rechnung_id: number;
  rechnung_tisch: number;
  rechnung_typ: "RECHNUNG" | "STORNO";
  rechnung_erstellt_am: string;
  rechnung_gesamt: number;
  rechnung_positionen: RechnungPosition[];
  rechnung_kellner_id: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Math.abs(n).toFixed(2).replace(".", ",") + " €";
}

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " +
      d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  red,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  red?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        red
          ? "border-destructive/30 bg-destructive/5"
          : accent
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">{label}</p>
      <p
        className={`text-2xl font-black leading-none mb-1 ${
          red ? "text-destructive" : accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StatistikPage() {
  const router = useRouter();
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Kategorien: which category is expanded to show products
  const [expandedKat, setExpandedKat] = useState<string | null>(null);
  // Top Produkte: active category filter chip
  const [filterTopKat, setFilterTopKat] = useState<string>("alle");

  // Alle Rechnungen filters
  const [filterKellner, setFilterKellner] = useState<string>("alle");
  const [filterTyp, setFilterTyp] = useState<"alle" | "RECHNUNG" | "STORNO">("alle");
  const [filterTisch, setFilterTisch] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    loadRechnungen();
  }, []);

  async function loadRechnungen() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/admin/rechnungen/");
      if (res.status === 403) {
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error();
      const data: Rechnung[] = await res.json();
      setRechnungen(data);
    } catch {
      setError("Daten konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset() {
    if (resetConfirm !== "RESET") return;
    setIsResetting(true);
    try {
      const res = await fetch("/admin/reset/rechnungen/", { method: "POST" });
      if (!res.ok) throw new Error();
      setRechnungen([]);
      setResetConfirm("");
      setResetDialogOpen(false);
    } catch {
      setError("Reset fehlgeschlagen.");
    } finally {
      setIsResetting(false);
    }
  }

  // ── Global KPIs ────────────────────────────────────────────────────────────

  const rechRecords = useMemo(() => rechnungen.filter((r) => r.rechnung_typ === "RECHNUNG"), [rechnungen]);
  const stornoRecords = useMemo(() => rechnungen.filter((r) => r.rechnung_typ === "STORNO"), [rechnungen]);

  // Umsatz = tatsächlich eingenommenes Geld (RECHNUNG - STORNO)
  const umsatz = useMemo(() => rechnungen.reduce((s, r) => s + r.rechnung_gesamt, 0), [rechnungen]);
  const storni = useMemo(
    () => Math.abs(stornoRecords.reduce((s, r) => s + r.rechnung_gesamt, 0)),
    [stornoRecords]
  );

  // Total articles sold (net)
  const totalSold = useMemo(() => {
    let n = 0;
    for (const r of rechnungen) {
      const sign = r.rechnung_typ === "RECHNUNG" ? 1 : -1;
      for (const pos of r.rechnung_positionen) n += pos.amount * sign;
    }
    return Math.max(0, n);
  }, [rechnungen]);

  // ── Per-waiter ─────────────────────────────────────────────────────────────

  const kellnerStats = useMemo(() => {
    const map = new Map<string, { umsatz: number; storni: number; count: number }>();
    for (const r of rechnungen) {
      const k = r.rechnung_kellner_id || "Unbekannt";
      if (!map.has(k)) map.set(k, { umsatz: 0, storni: 0, count: 0 });
      const s = map.get(k)!;
      s.umsatz += r.rechnung_gesamt; // STORNO already negative, so sum = net
      if (r.rechnung_typ === "RECHNUNG") s.count++;
      else s.storni += Math.abs(r.rechnung_gesamt);
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.umsatz - a.umsatz);
  }, [rechnungen]);

  // ── Per-table ──────────────────────────────────────────────────────────────

  const tischStats = useMemo(() => {
    const map = new Map<number, { revenue: number; count: number }>();
    for (const r of rechnungen) {
      if (!map.has(r.rechnung_tisch)) map.set(r.rechnung_tisch, { revenue: 0, count: 0 });
      const s = map.get(r.rechnung_tisch)!;
      s.revenue += r.rechnung_gesamt;
      if (r.rechnung_typ === "RECHNUNG") s.count++;
    }
    return Array.from(map.entries())
      .map(([tisch, s]) => ({ tisch, ...s }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [rechnungen]);

  const maxTischRevenue = useMemo(() => Math.max(...tischStats.map((t) => t.revenue), 1), [tischStats]);
  const bestTable = tischStats[0] ?? null;

  // ── Per-category + products within each category ───────────────────────────

  const katStats = useMemo(() => {
    const map = new Map<
      string,
      { sold: number; revenue: number; stornoSold: number; stornoRevenue: number }
    >();
    for (const r of rechnungen) {
      for (const pos of r.rechnung_positionen) {
        const k = pos.kategorie || "Sonstiges";
        if (!map.has(k)) map.set(k, { sold: 0, revenue: 0, stornoSold: 0, stornoRevenue: 0 });
        const s = map.get(k)!;
        if (r.rechnung_typ === "RECHNUNG") {
          s.sold += pos.amount;
          s.revenue += pos.amount * pos.price;
        } else {
          s.stornoSold += pos.amount;
          s.stornoRevenue += pos.amount * pos.price;
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({
        name,
        sold: s.sold - s.stornoSold,
        revenue: s.revenue - s.stornoRevenue,
        grossRevenue: s.revenue,
        stornoRevenue: s.stornoRevenue,
      }))
      .filter((s) => s.sold > 0 || s.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [rechnungen]);

  const maxKatRevenue = useMemo(() => Math.max(...katStats.map((k) => k.revenue), 1), [katStats]);

  // Products grouped by category (sorted by revenue)
  const productsByKat = useMemo(() => {
    const map = new Map<string, Map<string, { sold: number; revenue: number }>>();
    for (const r of rechnungen) {
      for (const pos of r.rechnung_positionen) {
        const k = pos.kategorie || "Sonstiges";
        if (!map.has(k)) map.set(k, new Map());
        const pm = map.get(k)!;
        if (!pm.has(pos.name)) pm.set(pos.name, { sold: 0, revenue: 0 });
        const s = pm.get(pos.name)!;
        if (r.rechnung_typ === "RECHNUNG") {
          s.sold += pos.amount;
          s.revenue += pos.amount * pos.price;
        } else {
          s.sold -= pos.amount;
          s.revenue -= pos.amount * pos.price;
        }
      }
    }
    const result = new Map<string, { name: string; sold: number; revenue: number }[]>();
    map.forEach((pm, kat) => {
      result.set(
        kat,
        Array.from(pm.entries())
          .map(([name, s]) => ({ name, ...s }))
          .filter((s) => s.sold > 0)
          .sort((a, b) => b.revenue - a.revenue)
      );
    });
    return result;
  }, [rechnungen]);

  // ── All products (for Top Produkte with category filter) ───────────────────

  const allProducts = useMemo(() => {
    const map = new Map<string, { sold: number; revenue: number; kategorie: string }>();
    for (const r of rechnungen) {
      for (const pos of r.rechnung_positionen) {
        if (!map.has(pos.name)) map.set(pos.name, { sold: 0, revenue: 0, kategorie: pos.kategorie });
        const s = map.get(pos.name)!;
        if (r.rechnung_typ === "RECHNUNG") {
          s.sold += pos.amount;
          s.revenue += pos.amount * pos.price;
        } else {
          s.sold -= pos.amount;
          s.revenue -= pos.amount * pos.price;
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, ...s }))
      .filter((s) => s.sold > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [rechnungen]);

  const displayedProducts = useMemo(() => {
    if (filterTopKat === "alle") return allProducts.slice(0, 15);
    return allProducts.filter((p) => p.kategorie === filterTopKat);
  }, [filterTopKat, allProducts]);

  const uniqueCategories = useMemo(() => katStats.map((k) => k.name), [katStats]);

  // ── Unique kellner for filter ──────────────────────────────────────────────

  const uniqueKellner = useMemo(() => {
    const set = new Set<string>();
    rechnungen.forEach((r) => {
      if (r.rechnung_kellner_id) set.add(r.rechnung_kellner_id);
    });
    return Array.from(set).sort();
  }, [rechnungen]);

  // ── Filtered invoice list ──────────────────────────────────────────────────

  const filteredRechnungen = useMemo(() => {
    return rechnungen.filter((r) => {
      if (filterKellner !== "alle" && r.rechnung_kellner_id !== filterKellner) return false;
      if (filterTyp !== "alle" && r.rechnung_typ !== filterTyp) return false;
      if (filterTisch && r.rechnung_tisch.toString() !== filterTisch) return false;
      return true;
    });
  }, [rechnungen, filterKellner, filterTyp, filterTisch]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-20">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          className="w-10 h-10 p-0 mr-2 rounded-full"
          onClick={() => router.push("/settings")}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Statistiken</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Event-Auswertung
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={loadRechnungen}>
          <RefreshCcw className="w-3 h-3" /> Aktualisieren
        </Button>
      </div>

      {error && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 font-bold text-center sticky top-14 z-10">
          {error}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-6">

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Umsatz"
            value={fmt(umsatz)}
            sub={`${rechRecords.length} Rechnungen`}
            accent
          />
          <KpiCard
            label="Storniert"
            value={storni > 0 ? `-${fmt(storni)}` : "—"}
            sub={`${stornoRecords.length} Stornos`}
            red={storni > 0}
          />
          <KpiCard
            label="Stärkster Tisch"
            value={bestTable ? `Tisch ${bestTable.tisch}` : "—"}
            sub={bestTable ? fmt(bestTable.revenue) : "Keine Daten"}
          />
          <KpiCard
            label="Artikel"
            value={totalSold.toString()}
            sub="Stück verkauft (netto)"
          />
        </div>

        {/* ── Kellner Übersicht ─────────────────────────────────────────────── */}
        {kellnerStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Kellner</CardTitle>
                  <CardDescription>Umsatz pro Mitarbeiter</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-0">
              {kellnerStats.map((k) => (
                <div
                  key={k.name}
                  className="flex items-center gap-3 py-3 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{k.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {k.count} Rechnung{k.count !== 1 ? "en" : ""}
                      {k.storni > 0 ? ` · Storno -${fmt(k.storni)}` : ""}
                    </p>
                  </div>
                  <p className="font-black text-foreground shrink-0">{fmt(k.umsatz)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Tisch Übersicht ───────────────────────────────────────────────── */}
        {tischStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <TableProperties className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Tische</CardTitle>
                  <CardDescription>Umsatz pro Tisch</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {tischStats.map((t) => (
                <div key={t.tisch}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-foreground">Tisch {t.tisch}</p>
                    <div className="text-right">
                      <span className="text-sm font-black text-foreground">{fmt(t.revenue)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {t.count} Bestellung{t.count !== 1 ? "en" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${(t.revenue / maxTischRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Kategorien (expandable with products) ────────────────────────── */}
        {katStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Kategorien</CardTitle>
                  <CardDescription>Antippen für Produktdetails</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              {katStats.map((k) => {
                const isExpanded = expandedKat === k.name;
                const products = productsByKat.get(k.name) ?? [];
                return (
                  <div key={k.name} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedKat(isExpanded ? null : k.name)}
                      className="w-full p-3 active:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-foreground text-left">{k.name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-sm font-black text-foreground">{fmt(k.revenue)}</span>
                            <span className="text-xs text-muted-foreground ml-1.5">{k.sold}×</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(k.revenue / maxKatRevenue) * 100}%` }}
                        />
                      </div>
                      {k.stornoRevenue > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5 text-left">
                          Brutto {fmt(k.grossRevenue)} · Storno -{fmt(k.stornoRevenue)}
                        </p>
                      )}
                    </button>

                    {isExpanded && products.length > 0 && (
                      <div className="border-t border-border bg-secondary/10 px-3 pb-3 pt-2 flex flex-col gap-0">
                        {products.map((p, idx) => (
                          <div
                            key={p.name}
                            className="flex items-center gap-2.5 py-2 border-b border-border/50 last:border-0"
                          >
                            <div className="w-5 text-center text-xs font-black text-muted-foreground/60 shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.sold}× verkauft</p>
                            </div>
                            <p className="text-sm font-black text-foreground shrink-0">{fmt(p.revenue)}</p>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-black text-foreground pt-2 mt-1 border-t border-border">
                          <span>Gesamt {k.name}</span>
                          <span>{fmt(k.revenue)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ── Top Produkte (mit Kategorie-Filter) ──────────────────────────── */}
        {allProducts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Top Produkte</CardTitle>
                  <CardDescription>
                    {filterTopKat === "alle"
                      ? `Top ${Math.min(15, allProducts.length)} · nach Umsatz`
                      : `${filterTopKat} · alle Produkte`}
                  </CardDescription>
                </div>
              </div>

              {/* Category filter chips */}
              {uniqueCategories.length > 1 && (
                <div className="overflow-x-auto">
                  <div className="flex gap-2 w-max pb-1">
                    <button
                      onClick={() => setFilterTopKat("alle")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterTopKat === "alle"
                          ? "bg-foreground text-background"
                          : "bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      Alle
                    </button>
                    {uniqueCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilterTopKat(filterTopKat === cat ? "alle" : cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          filterTopKat === cat
                            ? "bg-foreground text-background"
                            : "bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-0 pt-0">
              {displayedProducts.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6 opacity-50">
                  Keine Produkte in dieser Kategorie
                </p>
              ) : (
                displayedProducts.map((p, idx) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-3 py-3 border-b border-border last:border-0"
                  >
                    <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground text-xs font-black shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sold}× verkauft
                        {filterTopKat === "alle" && p.kategorie ? (
                          <span className="ml-1.5 opacity-60">· {p.kategorie}</span>
                        ) : null}
                      </p>
                    </div>
                    <p className="font-black text-foreground shrink-0">{fmt(p.revenue)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Alle Rechnungen ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base">Alle Rechnungen</CardTitle>
                <CardDescription>
                  {filteredRechnungen.length} von {rechnungen.length} angezeigt
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-3">
              <select
                value={filterKellner}
                onChange={(e) => setFilterKellner(e.target.value)}
                className="text-xs rounded-lg border border-border bg-secondary/50 px-2 py-1.5 text-foreground font-medium"
              >
                <option value="alle">Alle Kellner</option>
                {uniqueKellner.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>

              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                {(["alle", "RECHNUNG", "STORNO"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterTyp(t)}
                    className={`px-2.5 py-1.5 transition-colors ${
                      filterTyp === t
                        ? "bg-foreground text-background"
                        : "bg-secondary/50 text-muted-foreground"
                    }`}
                  >
                    {t === "alle" ? "Alle" : t === "RECHNUNG" ? "Rechnung" : "Storno"}
                  </button>
                ))}
              </div>

              <input
                type="number"
                placeholder="Tisch"
                value={filterTisch}
                onChange={(e) => setFilterTisch(e.target.value)}
                className="text-xs rounded-lg border border-border bg-secondary/50 px-2 py-1.5 w-20 text-foreground font-medium"
              />
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-2 pt-0">
            {filteredRechnungen.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8 opacity-50">
                Keine Rechnungen gefunden
              </p>
            ) : (
              filteredRechnungen.map((r) => {
                const isStorno = r.rechnung_typ === "STORNO";
                const isExpanded = expandedId === r.rechnung_id;
                return (
                  <div
                    key={r.rechnung_id}
                    className={`border rounded-xl overflow-hidden ${
                      isStorno ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
                    }`}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.rechnung_id)}
                      className="w-full flex items-center gap-3 p-3 text-left active:opacity-70 transition-opacity"
                    >
                      <div
                        className={`rounded-lg p-2 shrink-0 ${
                          isStorno ? "bg-destructive/10" : "bg-secondary"
                        }`}
                      >
                        {isStorno ? (
                          <RefreshCcw className="w-4 h-4 text-destructive" />
                        ) : (
                          <Receipt className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm">
                          Tisch {r.rechnung_tisch}
                          {isStorno && (
                            <span className="ml-2 text-destructive text-xs font-bold uppercase">
                              Storno
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs truncate">
                          {fmtDateTime(r.rechnung_erstellt_am)}
                          {r.rechnung_kellner_id ? ` · ${r.rechnung_kellner_id}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-black text-sm ${
                            isStorno ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          {isStorno ? "-" : ""}
                          {fmt(r.rechnung_gesamt)}
                        </p>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto mt-1" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto mt-1" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border px-3 pb-3 pt-2 bg-secondary/10">
                        {r.rechnung_positionen.map((pos, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-0.5">
                            <span className="text-foreground/80">
                              {pos.amount}× {pos.name}
                              {pos.kategorie && (
                                <span className="text-muted-foreground ml-1.5">
                                  ({pos.kategorie})
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground">{fmt(pos.price * pos.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Event Reset ──────────────────────────────────────────────────── */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base">Event zurücksetzen</CardTitle>
                <CardDescription>Alle Rechnungsdaten unwiderruflich löschen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Löscht alle {rechnungen.length} Rechnungen und setzt den ID-Counter zurück. Das
              System ist danach bereit für das nächste Event.
            </p>
            <AlertDialog
              open={resetDialogOpen}
              onOpenChange={(open) => {
                setResetDialogOpen(open);
                if (!open) setResetConfirm("");
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={rechnungen.length === 0}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Event zurücksetzen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[90%] max-w-sm rounded-2xl bg-card border border-border text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">Wirklich zurücksetzen?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-muted-foreground mt-2 flex flex-col gap-3">
                      <p>
                        Diese Aktion löscht{" "}
                        <strong className="text-foreground">{rechnungen.length} Rechnungen</strong>{" "}
                        unwiderruflich.
                      </p>
                      <p className="text-sm">
                        Gib{" "}
                        <span className="font-mono font-bold text-destructive">RESET</span> ein um
                        fortzufahren:
                      </p>
                      <input
                        type="text"
                        value={resetConfirm}
                        onChange={(e) => setResetConfirm(e.target.value)}
                        placeholder="RESET"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono text-center text-foreground"
                        autoComplete="off"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 mt-4">
                  <AlertDialogCancel className="flex-1 mt-0 bg-secondary border-border text-muted-foreground hover:bg-secondary/80 rounded-xl">
                    Abbrechen
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold disabled:opacity-40"
                    disabled={resetConfirm !== "RESET" || isResetting}
                    onClick={handleReset}
                  >
                    {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zurücksetzen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
