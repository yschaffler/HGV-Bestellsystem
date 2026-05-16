"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RefreshCcw,
  Receipt,
  Minus,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  X,
  ChevronDown,
  ChevronUp,
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

type ApiCategory = { category_id: number; category_name: string; category_color: string };
type ApiProduct = { product_id: number; price: number; name: string; category: number };

type Product = {
  id: string;
  name: string;
  category: string;
  categoryColor: string;
  price: number;
};

type CartItem = {
  productId: string;
  name: string;
  amount: number;
  price: number;
};

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
};

// Aggregated item available for return (RECHNUNG total minus STORNO total)
type ReturnableItem = {
  productId: string;
  name: string;
  availableAmount: number;
  price: number;
  kategorie: string;
};

type ReturnQueueItem = {
  productId: string;
  amount: number;
};

type Props = {
  waiterId: string;
  table: number;
  onBack: () => void;
};

type Mode = "home" | "ordering" | "returning" | "invoices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Math.abs(n).toFixed(2).replace(".", ",") + " €";
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TableOverviewStep({ waiterId, table, onBack }: Props) {
  const [mode, setMode] = useState<Mode>("home");

  // Products (loaded on mount for ordering)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Cart (ordering mode)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartExpanded, setCartExpanded] = useState(true);

  // Rechnungen (invoices mode)
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Return (returning mode)
  const [returnableItems, setReturnableItems] = useState<ReturnableItem[]>([]);
  const [returnQueue, setReturnQueue] = useState<ReturnQueueItem[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load products & categories on mount ──────────────────────────────────

  useEffect(() => {
    loadProductsAndCategories();
  }, []);

  async function loadProductsAndCategories() {
    setIsLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch("/get/all-categories/"),
        fetch("/get/all-products/"),
      ]);
      if (!catRes.ok || !prodRes.ok) throw new Error();

      const catData: ApiCategory[] = await catRes.json();
      const prodData: ApiProduct[] = await prodRes.json();

      const catMap = new Map<number, { name: string; color: string }>();
      catData.forEach((c) =>
        catMap.set(c.category_id, { name: c.category_name, color: c.category_color || "#6366f1" })
      );

      const seen = new Set<string>();
      const uniqueCats: { name: string; color: string }[] = [];
      catData.forEach((c) => {
        if (!seen.has(c.category_name)) {
          seen.add(c.category_name);
          uniqueCats.push({ name: c.category_name, color: c.category_color || "#6366f1" });
        }
      });
      setCategories(uniqueCats);

      setProducts(
        prodData.map((p) => {
          const cat = catMap.get(p.category) || { name: "Sonstiges", color: "#6366f1" };
          return { id: p.product_id.toString(), name: p.name, category: cat.name, categoryColor: cat.color, price: p.price };
        })
      );
    } catch {
      setError("Produkte konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Load rechnungen (lazy, on entering invoices/returning mode) ───────────

  async function loadRechnungen(): Promise<Rechnung[]> {
    setIsLoading(true);
    try {
      const res = await fetch(`/get/rechnungen/table/${table}`);
      if (!res.ok) throw new Error();
      const data: Rechnung[] = await res.json();
      setRechnungen(data);
      return data;
    } catch {
      setError("Rechnungen konnten nicht geladen werden.");
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async function goToInvoices() {
    setMode("invoices");
    setExpandedId(null);
    await loadRechnungen();
  }

  async function goToReturning() {
    setReturnQueue([]);
    setMode("returning");
    const data = await loadRechnungen();
    buildReturnableItems(data);
  }

  function buildReturnableItems(data: Rechnung[]) {
    // Sum all RECHNUNG positions, then subtract STORNO amounts
    const map = new Map<string, ReturnableItem>();

    for (const r of data.filter((r) => r.rechnung_typ === "RECHNUNG")) {
      for (const pos of r.rechnung_positionen) {
        const key = pos.product_id.toString();
        if (map.has(key)) {
          map.get(key)!.availableAmount += pos.amount;
        } else {
          map.set(key, { productId: key, name: pos.name, availableAmount: pos.amount, price: pos.price, kategorie: pos.kategorie });
        }
      }
    }

    for (const r of data.filter((r) => r.rechnung_typ === "STORNO")) {
      for (const pos of r.rechnung_positionen) {
        const key = pos.product_id.toString();
        if (map.has(key)) {
          map.get(key)!.availableAmount -= pos.amount;
        }
      }
    }

    setReturnableItems(Array.from(map.values()).filter((i) => i.availableAmount > 0));
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────

  function addToCart(product: Product) {
    if (navigator.vibrate) navigator.vibrate(12);
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === product.id);
      if (ex) return prev.map((i) => (i.productId === product.id ? { ...i, amount: i.amount + 1 } : i));
      return [...prev, { productId: product.id, name: product.name, amount: 1, price: product.price }];
    });
  }

  function changeCart(productId: string, delta: number) {
    if (navigator.vibrate) navigator.vibrate(10);
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, amount: i.amount + delta } : i)).filter((i) => i.amount > 0)
    );
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.amount, 0);
  const cartCount = cart.reduce((s, i) => s + i.amount, 0);

  // ── Order: create Rechnung, no bestellungen ───────────────────────────────

  async function handleOrderAndPay() {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      await fetch("/add/rechnung/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tisch: table,
          kellner_id: waiterId || "",
          typ: "RECHNUNG",
          gesamt: cartTotal,
          positionen: cart.map((c) => ({
            product_id: parseInt(c.productId),
            name: c.name,
            amount: c.amount,
            price: c.price,
            kategorie: products.find((p) => p.id === c.productId)?.category || "",
          })),
        }),
      });
      if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
      setCart([]);
      setMode("home");
    } catch {
      setError("Fehler beim Kassieren.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Return: create STORNO Rechnung ────────────────────────────────────────

  function addToReturnQueue(item: ReturnableItem) {
    const queued = returnQueue.find((r) => r.productId === item.productId)?.amount || 0;
    if (queued >= item.availableAmount) return;
    if (navigator.vibrate) navigator.vibrate(12);
    setReturnQueue((prev) => {
      const ex = prev.find((r) => r.productId === item.productId);
      if (ex) return prev.map((r) => (r.productId === item.productId ? { ...r, amount: r.amount + 1 } : r));
      return [...prev, { productId: item.productId, amount: 1 }];
    });
  }

  function changeReturnQueue(productId: string, delta: number) {
    if (navigator.vibrate) navigator.vibrate(10);
    setReturnQueue((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, amount: r.amount + delta } : r)).filter((r) => r.amount > 0)
    );
  }

  const returnTotal = returnQueue.reduce((s, r) => {
    const item = returnableItems.find((i) => i.productId === r.productId);
    return s + (item ? item.price * r.amount : 0);
  }, 0);

  const returnQueueCount = returnQueue.reduce((s, r) => s + r.amount, 0);

  async function handleReturnConfirm() {
    if (returnQueue.length === 0) return;
    setIsSubmitting(true);
    try {
      await fetch("/add/rechnung/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tisch: table,
          kellner_id: waiterId || "",
          typ: "STORNO",
          gesamt: -returnTotal,
          positionen: returnQueue.map((r) => {
            const item = returnableItems.find((i) => i.productId === r.productId)!;
            return { product_id: parseInt(r.productId), name: item.name, amount: r.amount, price: item.price, kategorie: item.kategorie };
          }),
        }),
      });
      if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
      setReturnQueue([]);
      setMode("home");
    } catch {
      setError("Fehler bei der Retoure.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredProducts = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : products;

  const invoiceRechnungen = rechnungen.filter((r) => r.rechnung_typ === "RECHNUNG");
  const stornoRechnungen = rechnungen.filter((r) => r.rechnung_typ === "STORNO");

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden">
      {/* Error banner */}
      {error && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3 text-sm font-semibold flex items-center justify-between shrink-0 z-50">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 p-1 opacity-70 hover:opacity-100 active:scale-95 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── HOME ──────────────────────────────────────────────────────────────── */}
      {mode === "home" && (
        <div className="flex flex-col h-full">
          <div className="px-5 pt-8 pb-6 shrink-0">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">Tisch</p>
            <div className="text-7xl font-black text-primary leading-none">{table}</div>
          </div>

          <div className="flex-1 px-4 pb-6 flex flex-col gap-3 justify-end">
            {/* Primary: Bestellen */}
            <button
              onClick={() => setMode("ordering")}
              className="bg-primary hover:bg-primary/90 active:scale-[0.97] transition-all rounded-3xl flex items-center gap-5 px-6 py-6 shadow-lg shadow-primary/10"
            >
              <div className="bg-primary-foreground/10 rounded-2xl p-4 shrink-0">
                <ShoppingCart className="w-9 h-9 text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="text-xl font-black text-primary-foreground">Bestellen & Kassieren</p>
                <p className="text-primary-foreground/50 text-sm mt-0.5">Sofortbezahlung · Rechnung wird erstellt</p>
              </div>
            </button>

            {/* Secondary: Retoure + Rechnungen */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={goToReturning}
                className="bg-secondary/50 hover:bg-secondary/80 active:scale-[0.97] transition-all rounded-2xl flex flex-col items-center justify-center gap-3 py-7 border border-border"
              >
                <div className="bg-destructive/10 rounded-xl p-3">
                  <RefreshCcw className="w-7 h-7 text-destructive" />
                </div>
                <p className="text-sm font-bold text-foreground">Warenretoure</p>
              </button>

              <button
                onClick={goToInvoices}
                className="bg-secondary/50 hover:bg-secondary/80 active:scale-[0.97] transition-all rounded-2xl flex flex-col items-center justify-center gap-3 py-7 border border-border"
              >
                <div className="bg-secondary rounded-xl p-3">
                  <Receipt className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground">Rechnungen</p>
              </button>
            </div>

            {/* Back */}
            <button
              onClick={onBack}
              className="bg-secondary/30 hover:bg-secondary/50 active:scale-[0.97] transition-all rounded-2xl flex items-center justify-center gap-2 py-4 border border-border"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground font-semibold">Zurück zur Tischauswahl</span>
            </button>
          </div>
        </div>
      )}

      {/* ── ORDERING ──────────────────────────────────────────────────────────── */}
      {mode === "ordering" && (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0">
            <button
              onClick={() => { setCart([]); setMode("home"); }}
              className="bg-secondary/50 hover:bg-secondary/80 active:scale-95 transition-all rounded-xl p-3"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-foreground leading-none">Neue Bestellung</h2>
              <p className="text-muted-foreground text-xs mt-0.5">Tisch {table}</p>
            </div>
            {cartCount > 0 && (
              <div className="bg-primary rounded-xl px-3 py-2 text-primary-foreground font-bold text-sm shrink-0">
                {cartCount} × {fmt(cartTotal)}
              </div>
            )}
          </div>

          {/* Category filter */}
          {categories.length > 1 && (
            <div className="px-4 pb-3 shrink-0 overflow-x-auto">
              <div className="flex gap-2 w-max">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeCategory === null ? "bg-foreground text-background" : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  Alle
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                    style={{ backgroundColor: activeCategory === cat.name ? cat.color : undefined, borderColor: cat.color }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                      activeCategory === cat.name ? "text-white" : "bg-transparent text-muted-foreground"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product grid – 2 columns */}
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Lade…
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pb-2">
                {filteredProducts.map((p) => {
                  const count = cart.find((i) => i.productId === p.id)?.amount || 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      style={{ borderColor: `${p.categoryColor}60`, backgroundColor: `${p.categoryColor}14` }}
                      className="relative border rounded-2xl p-4 flex flex-col items-start justify-between gap-3 active:scale-95 transition-all min-h-25"
                    >
                      <span className="text-foreground font-bold text-base leading-tight text-left">{p.name}</span>
                      <span className="text-muted-foreground text-sm font-semibold">{fmt(p.price)}</span>
                      {count > 0 && (
                        <div
                          style={{ backgroundColor: p.categoryColor }}
                          className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg"
                        >
                          {count}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart + confirm */}
          <div className="shrink-0 bg-card border-t border-border">
            {cart.length > 0 && (
              <>
                <button
                  onClick={() => setCartExpanded((v) => !v)}
                  className="w-full flex items-center justify-between px-4 pt-3 pb-2 active:opacity-70 transition-opacity"
                >
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                    Warenkorb · {cartCount} Artikel
                  </span>
                  {cartExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {cartExpanded && (
                  <div className="px-4 pb-2 max-h-44 overflow-y-auto">
                    <div className="flex flex-col gap-2">
                      {cart.map((item) => (
                        <div key={item.productId} className="flex items-center gap-3">
                          <div className="flex items-center bg-secondary/50 rounded-xl shrink-0">
                            <button
                              onClick={() => changeCart(item.productId, -1)}
                              className="p-3 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
                            >
                              {item.amount === 1 ? (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              ) : (
                                <Minus className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-foreground font-bold text-sm w-6 text-center">{item.amount}</span>
                            <button
                              onClick={() => changeCart(item.productId, 1)}
                              className="p-3 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="flex-1 text-sm text-foreground/80 font-medium truncate">{item.name}</span>
                          <span className="text-muted-foreground text-sm font-semibold shrink-0">
                            {fmt(item.price * item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="p-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={cart.length === 0}
                    className="w-full h-16 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground active:scale-[0.97] transition-all"
                  >
                    <CheckCircle2 className="w-6 h-6 mr-2" />
                    {cart.length > 0 ? `Kassieren · ${fmt(cartTotal)}` : "Artikel auswählen"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[90%] max-w-sm rounded-2xl bg-card border border-border text-foreground">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Bestellung bestätigen</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-muted-foreground mt-2">
                        <p className="mb-3">Gesamtbetrag:</p>
                        <p className="text-3xl font-black text-foreground">{fmt(cartTotal)}</p>
                        <div className="mt-3 flex flex-col gap-1.5">
                          {cart.map((i) => (
                            <div key={i.productId} className="flex justify-between text-sm">
                              <span className="text-foreground/80">{i.amount}× {i.name}</span>
                              <span className="text-muted-foreground">{fmt(i.price * i.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row gap-2 mt-4">
                    <AlertDialogCancel className="flex-1 mt-0 bg-secondary border-border text-muted-foreground hover:bg-secondary/80 rounded-xl">
                      Abbrechen
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold"
                      onClick={handleOrderAndPay}
                    >
                      Kassieren
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}

      {/* ── RETURNING ─────────────────────────────────────────────────────────── */}
      {mode === "returning" && (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0">
            <button
              onClick={() => { setReturnQueue([]); setMode("home"); }}
              className="bg-secondary/50 hover:bg-secondary/80 active:scale-95 transition-all rounded-xl p-3"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-foreground leading-none">Warenretoure</h2>
              <p className="text-muted-foreground text-xs mt-0.5">Tisch {table} · Storno an Bar</p>
            </div>
            {returnQueueCount > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-destructive font-bold text-sm shrink-0">
                -{fmt(returnTotal)}
              </div>
            )}
          </div>

          <div className="mx-4 mb-3 shrink-0 bg-destructive/5 border border-destructive/20 rounded-2xl px-4 py-3">
            <p className="text-destructive/70 text-xs font-semibold uppercase tracking-widest text-center">
              Artikel antippen · Storno wird an Bar gesendet
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Lade…
              </div>
            ) : returnableItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/50 gap-3">
                <RefreshCcw className="w-10 h-10" />
                <p className="text-sm font-medium">Keine Artikel zum Stornieren</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {returnableItems.map((item) => {
                  const queued = returnQueue.find((r) => r.productId === item.productId)?.amount || 0;
                  const remaining = item.availableAmount - queued;
                  const isSelected = queued > 0;

                  return (
                    <div
                      key={item.productId}
                      className={`border rounded-2xl overflow-hidden transition-all ${
                        isSelected ? "border-destructive/40 bg-destructive/5" : "border-border bg-secondary/30"
                      }`}
                    >
                      <button
                        onClick={() => addToReturnQueue(item)}
                        disabled={remaining <= 0}
                        className="w-full flex items-center gap-4 p-4 text-left disabled:opacity-40 active:opacity-70 transition-opacity"
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-destructive/10" : "bg-secondary"
                          }`}
                        >
                          <span
                            className={`text-lg font-black ${
                              isSelected ? "text-destructive" : "text-foreground/80"
                            }`}
                          >
                            {remaining}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground text-base truncate">{item.name}</p>
                          <p className="text-muted-foreground text-sm">
                            {fmt(item.price)} / Stück · {item.availableAmount} bestellt
                          </p>
                        </div>
                        {!isSelected && remaining > 0 && (
                          <div className="bg-destructive/10 rounded-xl p-2.5 shrink-0">
                            <Minus className="w-5 h-5 text-destructive" />
                          </div>
                        )}
                      </button>

                      {isSelected && (
                        <div className="flex items-center justify-between px-4 pb-4 pt-1 border-t border-destructive/20">
                          <p className="text-destructive text-sm font-bold">
                            {queued}× stornieren ({fmt(item.price * queued)})
                          </p>
                          <div className="flex items-center bg-secondary/50 rounded-xl border border-destructive/30">
                            <button
                              onClick={() => changeReturnQueue(item.productId, -1)}
                              className="p-3 text-muted-foreground hover:text-destructive active:scale-90 transition-all"
                            >
                              {queued === 1 ? (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              ) : (
                                <Minus className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-destructive font-black text-base w-8 text-center">{queued}</span>
                            <button
                              onClick={() => changeReturnQueue(item.productId, 1)}
                              disabled={queued >= item.availableAmount}
                              className="p-3 text-muted-foreground hover:text-foreground active:scale-90 transition-all disabled:opacity-30"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 p-4 bg-card border-t border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={returnQueue.length === 0}
                  className="w-full h-16 rounded-2xl text-lg font-black bg-destructive hover:bg-destructive/90 disabled:bg-secondary disabled:text-muted-foreground text-destructive-foreground active:scale-[0.97] transition-all"
                >
                  <RefreshCcw className="w-6 h-6 mr-2" />
                  {returnQueue.length > 0
                    ? `${returnQueueCount} Artikel stornieren · ${fmt(returnTotal)}`
                    : "Artikel auswählen"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[90%] max-w-sm rounded-2xl bg-card border border-border text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle>Storno an Bar senden?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-muted-foreground mt-2">
                      <p className="mb-3">Folgende Artikel werden storniert:</p>
                      <div className="flex flex-col gap-1.5">
                        {returnQueue.map((r) => {
                          const item = returnableItems.find((i) => i.productId === r.productId);
                          if (!item) return null;
                          return (
                            <div key={r.productId} className="flex justify-between text-sm">
                              <span className="text-foreground/80">{r.amount}× {item.name}</span>
                              <span className="text-destructive font-semibold">-{fmt(item.price * r.amount)}</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-sm font-black text-foreground border-t border-border pt-2 mt-1">
                          <span>Gesamt</span>
                          <span className="text-destructive">-{fmt(returnTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 mt-4">
                  <AlertDialogCancel className="flex-1 mt-0 bg-secondary border-border text-muted-foreground hover:bg-secondary/80 rounded-xl">
                    Abbrechen
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold"
                    onClick={handleReturnConfirm}
                  >
                    Storno senden
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* ── INVOICES ──────────────────────────────────────────────────────────── */}
      {mode === "invoices" && (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-4 pt-5 pb-4 shrink-0">
            <button
              onClick={() => setMode("home")}
              className="bg-secondary/50 hover:bg-secondary/80 active:scale-95 transition-all rounded-xl p-3"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-black text-foreground leading-none">Rechnungen</h2>
              <p className="text-muted-foreground text-xs mt-0.5">Tisch {table}</p>
            </div>
            {invoiceRechnungen.length > 0 && (
              <div className="text-right shrink-0">
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Gesamt</p>
                <p className="font-black text-foreground text-lg">
                  {fmt(
                    rechnungen.reduce((s, r) => s + r.rechnung_gesamt, 0)
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Lade…
              </div>
            ) : rechnungen.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/50 gap-3">
                <Receipt className="w-10 h-10" />
                <p className="text-sm font-medium">Noch keine Rechnungen vorhanden</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {rechnungen.map((r) => {
                  const isStorno = r.rechnung_typ === "STORNO";
                  const isExpanded = expandedId === r.rechnung_id;
                  return (
                    <div
                      key={r.rechnung_id}
                      className={`border rounded-2xl overflow-hidden ${
                        isStorno
                          ? "border-destructive/30 bg-destructive/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : r.rechnung_id)}
                        className="w-full flex items-center gap-4 p-4 active:opacity-70 transition-opacity"
                      >
                        <div
                          className={`rounded-xl p-3 shrink-0 ${
                            isStorno ? "bg-destructive/10" : "bg-secondary"
                          }`}
                        >
                          {isStorno ? (
                            <RefreshCcw className="w-5 h-5 text-destructive" />
                          ) : (
                            <Receipt className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-bold text-foreground">
                            {fmtTime(r.rechnung_erstellt_am)} Uhr
                            {isStorno && (
                              <span className="ml-2 text-destructive text-xs font-bold uppercase">Storno</span>
                            )}
                          </p>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {fmtDate(r.rechnung_erstellt_am)} · {r.rechnung_positionen.length} Position{r.rechnung_positionen.length !== 1 ? "en" : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`font-black text-lg ${
                              isStorno ? "text-destructive" : "text-foreground"
                            }`}
                          >
                            {isStorno ? "-" : ""}{fmt(r.rechnung_gesamt)}
                          </p>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto mt-1" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto mt-1" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-4 pb-4 pt-3 bg-secondary/10">
                          <div className="flex flex-col gap-2">
                            {r.rechnung_positionen.map((pos, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-foreground/80">
                                  {pos.amount}× {pos.name}
                                </span>
                                <span className="text-muted-foreground font-semibold">
                                  {fmt(pos.price * pos.amount)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-black text-foreground border-t border-border pt-2 mt-1">
                              <span>Gesamt</span>
                              <span className={isStorno ? "text-destructive" : ""}>
                                {isStorno ? "-" : ""}{fmt(r.rechnung_gesamt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Summary row when there are storni */}
                {stornoRechnungen.length > 0 && (
                  <div className="mt-1 px-4 py-3 bg-secondary/20 rounded-2xl border border-border">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>Umsatz ({invoiceRechnungen.length} Rechnung{invoiceRechnungen.length !== 1 ? "en" : ""})</span>
                      <span>{fmt(invoiceRechnungen.reduce((s, r) => s + r.rechnung_gesamt, 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm text-destructive/80 mb-2">
                      <span>Stornos ({stornoRechnungen.length})</span>
                      <span>-{fmt(Math.abs(stornoRechnungen.reduce((s, r) => s + r.rechnung_gesamt, 0)))}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-foreground border-t border-border pt-2">
                      <span>Netto</span>
                      <span>{fmt(rechnungen.reduce((s, r) => s + r.rechnung_gesamt, 0))}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submitting overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl px-6 py-4 flex items-center gap-3 border border-border">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-foreground font-semibold">Bitte warten…</span>
          </div>
        </div>
      )}
    </div>
  );
}
