"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RefreshCcw,
  Receipt,
  History,
  Minus,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  X,
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

type CartItem = {
  productId: string;
  name: string;
  amount: number;
  price: number;
};

type ApiCategory = { category_id: number; category_name: string; category_color: string };
type ApiProduct = { product_id: number; price: number; name: string; category: number };

type Product = {
  id: string;
  name: string;
  category: string;
  categoryColor: string;
  price: number;
};

type HistoryOrder = {
  productId: string;
  name: string;
  amount: number;
  price: number;
  payed: boolean;
};

type Props = {
  waiterId: string;
  table: number;
  onBack: () => void;
};

type Mode = "home" | "ordering" | "returning" | "history";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TableOverviewStep({ table, onBack }: Props) {
  const [mode, setMode] = useState<Mode>("home");
  const [products, setProducts] = useState<Product[]>([]);
  const [existingOrders, setExistingOrders] = useState<CartItem[]>([]);
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [returnItems, setReturnItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([]);

  // ── Data loading ────────────────────────────────────────────────────────────

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [catRes, prodRes, orderRes] = await Promise.all([
        fetch("/get/all-categories/"),
        fetch("/get/all-products/"),
        fetch(`/get/order/table/${table}`),
      ]);
      if (!catRes.ok || !prodRes.ok || !orderRes.ok)
        throw new Error("Serverfehler");

      const catData: ApiCategory[] = await catRes.json();
      const prodData: ApiProduct[] = await prodRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderData: any[] = (await orderRes.json()) || [];

      const catMap = new Map<number, { name: string; color: string }>();
      catData.forEach((c) =>
        catMap.set(c.category_id, {
          name: c.category_name,
          color: c.category_color || "#6366f1",
        })
      );

      const uniqueCats: { name: string; color: string }[] = [];
      const seenCats = new Set<string>();
      catData.forEach((c) => {
        if (!seenCats.has(c.category_name)) {
          seenCats.add(c.category_name);
          uniqueCats.push({ name: c.category_name, color: c.category_color || "#6366f1" });
        }
      });
      setCategories(uniqueCats);

      const prodMap = new Map<number, ApiProduct>();
      const mapped: Product[] = prodData.map((p) => {
        const cat = catMap.get(p.category) || { name: "Sonstiges", color: "#6366f1" };
        prodMap.set(p.product_id, p);
        return {
          id: p.product_id.toString(),
          name: p.name,
          category: cat.name,
          categoryColor: cat.color,
          price: p.price,
        };
      });
      setProducts(mapped);

      // Separate open vs paid orders
      const openMap = new Map<number, CartItem>();
      const allHistory: HistoryOrder[] = [];

      orderData.forEach((o) => {
        const p = prodMap.get(o.order_product);
        if (!p) return;
        allHistory.push({
          productId: p.product_id.toString(),
          name: p.name,
          amount: o.order_amount,
          price: o.order_price,
          payed: !!o.order_payed,
        });
        if (!o.order_payed) {
          if (openMap.has(o.order_product)) {
            openMap.get(o.order_product)!.amount += o.order_amount;
          } else {
            openMap.set(o.order_product, {
              productId: p.product_id.toString(),
              name: p.name,
              amount: o.order_amount,
              price: o.order_price,
            });
          }
        }
      });
      setExistingOrders(Array.from(openMap.values()));
      setHistoryOrders(allHistory);
    } catch (e) {
      console.error(e);
      setError("Verbindungsfehler. Seite neu laden.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [table]);

  // ── Cart helpers ─────────────────────────────────────────────────────────────

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
      prev
        .map((i) => (i.productId === productId ? { ...i, amount: i.amount + delta } : i))
        .filter((i) => i.amount > 0)
    );
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.amount, 0);
  const cartCount = cart.reduce((s, i) => s + i.amount, 0);

  // ── Confirm order + instant checkout ─────────────────────────────────────────

  async function handleOrderAndPay() {
    if (cart.length === 0) return;
    setIsLoading(true);
    try {
      // 1. Book orders
      for (const item of cart) {
        await fetch("/add/order/", {
          method: "POST",
          body: JSON.stringify({
            order_product: parseInt(item.productId),
            order_amount: item.amount,
            order_price: item.price,
            order_payed: false,
            order_table: table,
          }),
        });
      }
      // 2. Immediately pay them
      await fetch("/pay/orders/", {
        method: "POST",
        body: JSON.stringify({
          table,
          items: cart.map((c) => ({ product: parseInt(c.productId), amount: c.amount })),
        }),
      });

      if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
      setCart([]);
      setMode("home");
      await loadData();
    } catch (e) {
      console.error(e);
      setError("Fehler beim Kassieren.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Return helpers ────────────────────────────────────────────────────────────

  function addReturn(item: CartItem) {
    const currentReturn = returnItems.find((i) => i.productId === item.productId)?.amount || 0;
    if (currentReturn >= item.amount) return;
    if (navigator.vibrate) navigator.vibrate(12);
    setReturnItems((prev) => {
      const ex = prev.find((i) => i.productId === item.productId);
      if (ex) return prev.map((i) => (i.productId === item.productId ? { ...i, amount: i.amount + 1 } : i));
      return [...prev, { ...item, amount: 1 }];
    });
  }

  function changeReturn(productId: string, delta: number) {
    if (navigator.vibrate) navigator.vibrate(10);
    setReturnItems((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, amount: i.amount + delta } : i))
        .filter((i) => i.amount > 0)
    );
  }

  const returnTotal = returnItems.reduce((s, i) => s + i.price * i.amount, 0);

  async function handleReturnConfirm() {
    if (returnItems.length === 0) return;
    setIsLoading(true);
    try {
      await fetch("/return/orders/", {
        method: "POST",
        body: JSON.stringify({
          table,
          items: returnItems.map((r) => ({ product: parseInt(r.productId), amount: r.amount })),
        }),
      });
      if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
      setReturnItems([]);
      setMode("home");
      await loadData();
    } catch (e) {
      console.error(e);
      setError("Fehler bei der Retoure.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Filtered products ─────────────────────────────────────────────────────────

  const filteredProducts = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : products;

  // ── Open tab total ────────────────────────────────────────────────────────────
  const openTotal = existingOrders.reduce((s, i) => s + i.price * i.amount, 0);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-white overflow-hidden">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm font-semibold text-center flex items-center justify-between shrink-0 z-50">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── HOME ──────────────────────────────────────────────────────────────── */}
      {mode === "home" && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 pt-6 pb-4 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Tisch</p>
                <h1 className="text-4xl font-black text-white leading-none">{table}</h1>
              </div>
              {openTotal > 0 && (
                <div className="text-right">
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Offen</p>
                  <p className="text-2xl font-black text-amber-400">{fmt(openTotal)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Open items preview */}
          {existingOrders.length > 0 && (
            <div className="mx-4 mb-4 bg-zinc-900 rounded-2xl px-4 py-3 shrink-0 border border-zinc-800">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">Offene Positionen</p>
              <div className="flex flex-col gap-1">
                {existingOrders.slice(0, 4).map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-zinc-300">{item.amount}× {item.name}</span>
                    <span className="text-zinc-400">{fmt(item.price * item.amount)}</span>
                  </div>
                ))}
                {existingOrders.length > 4 && (
                  <p className="text-zinc-600 text-xs mt-1">+{existingOrders.length - 4} weitere…</p>
                )}
              </div>
            </div>
          )}

          {/* Main action grid */}
          <div className="flex-1 px-4 pb-4 grid grid-cols-2 gap-3">
            {/* Bestellen – primary, full-height left */}
            <button
              onClick={() => setMode("ordering")}
              className="col-span-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] transition-all rounded-3xl flex flex-col items-center justify-center gap-3 shadow-lg shadow-indigo-900/40 py-6"
            >
              <div className="bg-indigo-500/50 rounded-2xl p-4">
                <ShoppingCart className="w-10 h-10 text-white" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">Bestellen & Kassieren</p>
                <p className="text-indigo-300 text-sm mt-0.5">Sofortbezahlung</p>
              </div>
            </button>

            <button
              onClick={() => setMode("returning")}
              disabled={existingOrders.length === 0}
              className="bg-zinc-900 hover:bg-zinc-800 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none transition-all rounded-3xl flex flex-col items-center justify-center gap-3 border border-zinc-800 py-6"
            >
              <div className="bg-zinc-800 rounded-2xl p-3">
                <RefreshCcw className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-base font-bold text-white">Warenretoure</p>
            </button>

            <button
              onClick={() => setMode("history")}
              className="bg-zinc-900 hover:bg-zinc-800 active:scale-[0.97] transition-all rounded-3xl flex flex-col items-center justify-center gap-3 border border-zinc-800 py-6"
            >
              <div className="bg-zinc-800 rounded-2xl p-3">
                <History className="w-7 h-7 text-zinc-300" />
              </div>
              <p className="text-base font-bold text-white">Rechnungen</p>
            </button>

            <button
              onClick={onBack}
              className="col-span-2 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.97] transition-all rounded-2xl flex items-center justify-center gap-2 py-4 border border-zinc-800"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
              <span className="text-zinc-300 font-semibold">Zurück zur Tischauswahl</span>
            </button>
          </div>
        </div>
      )}

      {/* ── ORDERING ──────────────────────────────────────────────────────────── */}
      {mode === "ordering" && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0">
            <button
              onClick={() => { setCart([]); setMode("home"); }}
              className="bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-xl p-2.5"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-black text-white leading-none">Neue Bestellung</h2>
              <p className="text-zinc-500 text-xs mt-0.5">Tisch {table} · Sofortkasse</p>
            </div>
            {cartCount > 0 && (
              <div className="bg-indigo-600 rounded-xl px-3 py-1.5 text-white font-bold text-sm">
                {cartCount} × {fmt(cartTotal)}
              </div>
            )}
          </div>

          {/* Category filter */}
          {categories.length > 1 && (
            <div className="px-4 pb-2 shrink-0 overflow-x-auto">
              <div className="flex gap-2 w-max">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeCategory === null ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-400"}`}
                >
                  Alle
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                    style={{ backgroundColor: activeCategory === cat.name ? cat.color : undefined, borderColor: cat.color }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${activeCategory === cat.name ? "text-white" : "bg-transparent text-zinc-400"}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Lade…
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 pb-2">
                {filteredProducts.map((p) => {
                  const count = cart.find((i) => i.productId === p.id)?.amount || 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      style={{ borderColor: `${p.categoryColor}60`, backgroundColor: `${p.categoryColor}14` }}
                      className="relative border rounded-2xl py-4 px-2 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                    >
                      <span className="text-white font-bold text-sm leading-tight">{p.name}</span>
                      <span className="text-zinc-400 text-xs font-medium">{fmt(p.price)}</span>
                      {count > 0 && (
                        <div
                          style={{ backgroundColor: p.categoryColor }}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg"
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

          {/* Cart preview + confirm */}
          <div className="shrink-0 bg-zinc-900 border-t border-zinc-800">
            {cart.length > 0 && (
              <div className="px-4 pt-3 pb-2 max-h-48 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-zinc-800 rounded-lg">
                        <button onClick={() => changeCart(item.productId, -1)} className="p-1.5 text-zinc-400 hover:text-white active:scale-90 transition-all">
                          {item.amount === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-white font-bold text-sm w-5 text-center">{item.amount}</span>
                        <button onClick={() => changeCart(item.productId, 1)} className="p-1.5 text-zinc-400 hover:text-white active:scale-90 transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="flex-1 text-sm text-zinc-200 font-medium">{item.name}</span>
                      <span className="text-zinc-400 text-sm">{fmt(item.price * item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 flex gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={cart.length === 0}
                    className="flex-1 h-14 rounded-2xl text-base font-black bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white active:scale-[0.97] transition-all shadow-lg shadow-indigo-900/30"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {cart.length > 0 ? `Kassieren · ${fmt(cartTotal)}` : "Artikel auswählen"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[90%] max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Bezahlung bestätigen</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-zinc-400 mt-2">
                        <p className="mb-3">Gesamtbetrag:</p>
                        <p className="text-3xl font-black text-white">{fmt(cartTotal)}</p>
                        <div className="mt-3 flex flex-col gap-1">
                          {cart.map((i) => (
                            <div key={i.productId} className="flex justify-between text-sm">
                              <span className="text-zinc-300">{i.amount}× {i.name}</span>
                              <span className="text-zinc-400">{fmt(i.price * i.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row gap-2 mt-4">
                    <AlertDialogCancel className="flex-1 mt-0 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 rounded-xl">
                      Abbrechen
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
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
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0">
            <button
              onClick={() => { setReturnItems([]); setMode("home"); }}
              className="bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-xl p-2.5"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-black text-white leading-none">Warenretoure</h2>
              <p className="text-zinc-500 text-xs mt-0.5">Tisch {table} · Artikel zurückgeben</p>
            </div>
            {returnItems.length > 0 && (
              <div className="bg-red-900/60 border border-red-700 rounded-xl px-3 py-1.5 text-red-300 font-bold text-sm">
                -{fmt(returnTotal)}
              </div>
            )}
          </div>

          {/* Banner */}
          <div className="mx-4 mb-3 shrink-0 bg-red-950/40 border border-red-800/50 rounded-2xl px-4 py-3">
            <p className="text-red-400 text-xs font-semibold uppercase tracking-widest text-center">
              Tippe auf einen Artikel um ihn zur Retoure hinzuzufügen
            </p>
          </div>

          {/* Existing order items */}
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            <div className="flex flex-col gap-2">
              {existingOrders.map((item) => {
                const returnCount = returnItems.find((i) => i.productId === item.productId)?.amount || 0;
                const remaining = item.amount - returnCount;
                return (
                  <div key={item.productId} className={`bg-zinc-900 border rounded-2xl p-4 flex items-center gap-3 transition-all ${returnCount > 0 ? "border-red-700/60 bg-red-950/20" : "border-zinc-800"}`}>
                    <button
                      onClick={() => addReturn(item)}
                      disabled={remaining <= 0}
                      className="flex-1 flex items-center gap-3 text-left disabled:opacity-40"
                    >
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                        <span className="font-black text-zinc-300">{remaining}</span>
                      </div>
                      <div>
                        <p className="font-bold text-white">{item.name}</p>
                        <p className="text-zinc-500 text-sm">{fmt(item.price)} / Stück</p>
                      </div>
                    </button>
                    {returnCount > 0 && (
                      <div className="flex items-center gap-1 bg-zinc-800 rounded-xl border border-red-800/40">
                        <button onClick={() => changeReturn(item.productId, -1)} className="p-2 text-zinc-400 hover:text-red-400 active:scale-90 transition-all">
                          {returnCount === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-red-400 font-black text-sm w-5 text-center">{returnCount}</span>
                        <button onClick={() => changeReturn(item.productId, 1)} disabled={returnCount >= item.amount} className="p-2 text-zinc-400 hover:text-white active:scale-90 transition-all disabled:opacity-30">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confirm */}
          <div className="shrink-0 p-4 bg-zinc-900 border-t border-zinc-800">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={returnItems.length === 0}
                  className="w-full h-14 rounded-2xl text-base font-black bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white active:scale-[0.97] transition-all"
                >
                  <RefreshCcw className="w-5 h-5 mr-2" />
                  {returnItems.length > 0 ? `Retoure buchen · ${fmt(returnTotal)}` : "Artikel auswählen"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[90%] max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Retoure bestätigen</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-zinc-400 mt-2">
                      <p className="mb-2">Folgende Artikel werden zurückgebucht:</p>
                      {returnItems.map((i) => (
                        <div key={i.productId} className="flex justify-between text-sm text-red-300">
                          <span>{i.amount}× {i.name}</span>
                          <span>-{fmt(i.price * i.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 mt-4">
                  <AlertDialogCancel className="flex-1 mt-0 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 rounded-xl">Abbrechen</AlertDialogCancel>
                  <AlertDialogAction className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold" onClick={handleReturnConfirm}>
                    Buchen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* ── HISTORY ───────────────────────────────────────────────────────────── */}
      {mode === "history" && (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-4 pt-5 pb-4 shrink-0">
            <button
              onClick={() => setMode("home")}
              className="bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-xl p-2.5"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div>
              <h2 className="text-xl font-black text-white leading-none">Rechnungen</h2>
              <p className="text-zinc-500 text-xs mt-0.5">Tisch {table} · Verlauf</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Lade…
              </div>
            ) : historyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
                <Receipt className="w-10 h-10" />
                <p className="text-sm font-medium">Noch keine Bestellungen</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Open */}
                {historyOrders.filter((o) => !o.payed).length > 0 && (
                  <>
                    <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-1">Offen</p>
                    {historyOrders.filter((o) => !o.payed).map((o, idx) => (
                      <div key={`open-${idx}`} className="bg-amber-950/30 border border-amber-800/40 rounded-2xl px-4 py-3 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white">{o.amount}× {o.name}</p>
                          <p className="text-xs text-amber-500 font-semibold mt-0.5">Offen</p>
                        </div>
                        <span className="font-bold text-amber-400">{fmt(o.price * o.amount)}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Paid */}
                {historyOrders.filter((o) => o.payed).length > 0 && (
                  <>
                    <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-1 mt-3">Bezahlt</p>
                    {historyOrders.filter((o) => o.payed).map((o, idx) => (
                      <div key={`paid-${idx}`} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex justify-between items-center opacity-60">
                        <div>
                          <p className="font-bold text-zinc-300">{o.amount}× {o.name}</p>
                          <p className="text-xs text-green-500 font-semibold mt-0.5">Kassiert</p>
                        </div>
                        <span className="font-bold text-zinc-400">{fmt(o.price * o.amount)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && mode !== "home" && (
        <div className="absolute inset-0 bg-zinc-950/70 flex items-center justify-center z-40 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl px-6 py-4 flex items-center gap-3 border border-zinc-700">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-white font-semibold">Bitte warten…</span>
          </div>
        </div>
      )}
    </div>
  );
}