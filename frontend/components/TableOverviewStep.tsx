"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Receipt, ArrowLeft, RefreshCcw, CheckCircle2, Minus, Plus, Trash2, Loader2 } from "lucide-react";
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

type OrderItem = {
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

type Props = {
  waiterId: string;
  table: number;
  onCheckout: () => void;
  onReturn: () => void;
  onBack: () => void;
};

type Mode = "menu" | "ordering" | "returning" | "checkout";

export function TableOverviewStep({ table, onCheckout, onReturn, onBack }: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [newItems, setNewItems] = useState<OrderItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [returnItems, setReturnItems] = useState<OrderItem[]>([]);

  const [existingOrders, setExistingOrders] = useState<OrderItem[]>([]);

  const [checkoutItems, setCheckoutItems] = useState<OrderItem[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    try {
      const catRes = await fetch("/get/all-categories/");
      const prodRes = await fetch("/get/all-products/");
      const orderRes = await fetch(`/get/order/table/${table}`);

      if (!catRes.ok || !prodRes.ok || !orderRes.ok) throw new Error("Daten konnten nicht vom Server geladen werden.");

      const catData: ApiCategory[] = await catRes.json();
      const prodData: ApiProduct[] = await prodRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderData: any[] = await orderRes.json() || [];

      const catMap = new Map<number, { name: string, color: string }>();
      catData.forEach(c => catMap.set(c.category_id, { name: c.category_name, color: c.category_color || "#3b82f6" }));

      const prodMap = new Map<number, ApiProduct>();
      const MAPPED_PRODUCTS: Product[] = prodData.map(p => {
        const catInfo = catMap.get(p.category) || { name: "Unbekannt", color: "#3b82f6" };
        prodMap.set(p.product_id, p);
        return {
          id: p.product_id.toString(),
          name: p.name,
          category: catInfo.name,
          categoryColor: catInfo.color,
          price: p.price,
        };
      });
      setProducts(MAPPED_PRODUCTS);

      const orderMap = new Map<number, OrderItem>();
      orderData.forEach(o => {
        if (o.order_payed) return;
        const p = prodMap.get(o.order_product);
        if (!p) return;

        if (orderMap.has(o.order_product)) {
          orderMap.get(o.order_product)!.amount += o.order_amount;
        } else {
          orderMap.set(o.order_product, {
            productId: p.product_id.toString(),
            name: p.name,
            amount: o.order_amount,
            price: o.order_price,
          });
        }
      });
      setExistingOrders(Array.from(orderMap.values()));

    } catch (err) {
      console.error(err);
      setError("Fehler beim Verbinden mit dem Server. Bitte lade die Seite neu.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [table]);

  const existingTotal = existingOrders.reduce((sum, item) => sum + (item.price * item.amount), 0);
  const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.amount), 0);
  const returnTotal = returnItems.reduce((sum, item) => sum + (item.price * item.amount), 0);
  const checkoutTotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.amount), 0);
  const totalAmount = existingTotal + newTotal;

  // ─── Bestellen ────────────────────────────────────────────────────────────

  function addNewItem(product: Product) {
    setNewItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, amount: i.amount + 1 } : i
        );
      }
      return [...prev, { productId: product.id, name: product.name, amount: 1, price: product.price }];
    });
    if (navigator.vibrate) navigator.vibrate(15);
    handleScroll();
  }

  function updateNewItemAmount(productId: string, delta: number) {
    setNewItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const updated = i.amount + delta;
        if (updated <= 0) return i;
        return { ...i, amount: updated };
      })
    );
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function removeNewItem(productId: string) {
    setNewItems((prev) => prev.filter((i) => i.productId !== productId));
    if (navigator.vibrate) navigator.vibrate(10);
  }

  // ─── Retoure ──────────────────────────────────────────────────────────────

  function addReturnItem(productId: string, name: string, price: number) {
    const ordered = existingOrders.find(i => i.productId === productId)?.amount || 0;
    const currentReturn = returnItems.find(i => i.productId === productId)?.amount || 0;
    if (currentReturn >= ordered) return;

    setReturnItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, amount: i.amount + 1 } : i
        );
      }
      return [...prev, { productId, name, amount: 1, price }];
    });
    if (navigator.vibrate) navigator.vibrate(15);
    handleScroll();
  }

  function updateReturnItemAmount(productId: string, delta: number) {
    setReturnItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const ordered = existingOrders.find(eo => eo.productId === productId)?.amount || 0;
        const updated = i.amount + delta;
        if (updated <= 0) return i;
        if (updated > ordered) return i;
        return { ...i, amount: updated };
      })
    );
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function removeReturnItem(productId: string) {
    setReturnItems((prev) => prev.filter((i) => i.productId !== productId));
    if (navigator.vibrate) navigator.vibrate(10);
  }

  // ─── Abrechnen ────────────────────────────────────────────────────────────

  function addCheckoutItem(productId: string, name: string, price: number) {
    const ordered = existingOrders.find(i => i.productId === productId)?.amount || 0;
    const currentCheckout = checkoutItems.find(i => i.productId === productId)?.amount || 0;
    if (currentCheckout >= ordered) return;

    setCheckoutItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, amount: i.amount + 1 } : i
        );
      }
      return [...prev, { productId, name, amount: 1, price }];
    });
    if (navigator.vibrate) navigator.vibrate(15);
    handleScroll();
  }

  function updateCheckoutItemAmount(productId: string, delta: number) {
    setCheckoutItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const ordered = existingOrders.find(eo => eo.productId === productId)?.amount || 0;
        const updated = i.amount + delta;
        if (updated <= 0) return i;
        if (updated > ordered) return i;
        return { ...i, amount: updated };
      })
    );
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function removeCheckoutItem(productId: string) {
    setCheckoutItems((prev) => prev.filter((i) => i.productId !== productId));
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function selectAllForCheckout() {
    setCheckoutItems([...existingOrders]);
    if (navigator.vibrate) navigator.vibrate(15);
  }

  async function handleCheckoutConfirm() {
    if (checkoutItems.length === 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/pay/orders/", {
        method: "POST",
        body: JSON.stringify({
          table: table,
          items: checkoutItems.map(c => ({ product: parseInt(c.productId), amount: c.amount }))
        })
      });
      if (!res.ok) throw new Error("Abrechnung fehlgeschlagen");

      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
      setCheckoutItems([]);
      setMode("menu");
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Fehler bei der Abrechnung");
    } finally {
      setIsLoading(false);
    }
  }

  async function saldo() {
    if (returnItems.length === 0 && newItems.length === 0) {
      setMode("menu");
      return;
    }
    setIsLoading(true);
    try {
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);

      for (const item of newItems) {
        await fetch("/add/order/", {
          method: "POST",
          body: JSON.stringify({
            order_product: parseInt(item.productId),
            order_amount: item.amount,
            order_price: item.price,
            order_payed: false,
            order_table: table
          })
        });
      }

      if (returnItems.length > 0) {
        await fetch("/return/orders/", {
          method: "POST",
          body: JSON.stringify({
            table: table,
            items: returnItems.map(r => ({ product: parseInt(r.productId), amount: r.amount }))
          })
        });
      }

      setReturnItems([]);
      setNewItems([]);
      setMode("menu");
      onBack();
    } catch (e) {
      console.error(e);
      setError("Fehler beim Verbuchen.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleScroll() {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 bg-muted/10 overflow-hidden">
      {error && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 font-bold text-center shrink-0 z-50">
          {error}
        </div>
      )}

      {mode === "checkout" ? (
        <div className="flex flex-col h-full w-full bg-background">
          {/* Top Half: Tisch Produkte */}
          <div className="flex-1 p-4 pb-2 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-xl font-bold tracking-tight">Tisch {table}</h2>
              <Button variant="outline" size="sm" onClick={selectAllForCheckout}>Alles abkassieren</Button>
            </div>
            <div className="bg-muted/10 rounded-2xl shadow-inner border p-4 flex-1 flex flex-col overflow-hidden">
              <h3 className="font-semibold text-muted-foreground mb-2 text-xs uppercase tracking-wider shrink-0">Auf dem Tisch</h3>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="flex flex-col gap-2">
                  {existingOrders.map(p => {
                    const checkoutCount = checkoutItems.find(i => i.productId === p.productId)?.amount || 0;
                    const remaining = p.amount - checkoutCount;
                    if (remaining <= 0) return null;
                    return (
                      <div
                        key={`top-${p.productId}`}
                        className="flex justify-between items-center py-3 px-4 bg-background hover:bg-muted/50 rounded-xl border cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
                        onClick={() => addCheckoutItem(p.productId, p.name, p.price)}
                      >
                        <div className="flex gap-3 items-center">
                          <span className="font-bold text-lg bg-muted/20 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border">{remaining}</span>
                          <span className="font-medium text-lg">{p.name}</span>
                        </div>
                        <span className="font-semibold text-muted-foreground">{(p.price * remaining).toFixed(2)}€</span>
                      </div>
                    )
                  })}
                  {existingOrders.every(p => (p.amount - (checkoutItems.find(i => i.productId === p.productId)?.amount || 0)) <= 0) && (
                    <div className="py-8 text-center text-muted-foreground opacity-50 flex flex-col items-center">
                      <CheckCircle2 className="w-8 h-8 mb-2" />
                      <p className="text-sm">Alles ausgewählt</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Half: Rechnung */}
          <div className="flex-[1.2] p-4 pt-2 flex flex-col overflow-hidden min-h-0 bg-blue-50/30 dark:bg-blue-950/10 border-t">
            <div className="bg-background rounded-2xl shadow-sm border border-blue-500/20 p-4 flex-1 flex flex-col overflow-hidden relative">
              <div className="flex justify-between items-center mb-3 shrink-0">
                <h3 className="font-semibold text-blue-600 text-xs uppercase tracking-wider">Rechnung (Ausgewählt)</h3>
                <span className="font-bold text-blue-600 text-xl">{checkoutTotal.toFixed(2)}€</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="flex flex-col gap-2">
                  {checkoutItems.map(item => (
                    <div
                      key={`bot-${item.productId}`}
                      className="flex justify-between items-center py-3 px-4 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl border border-blue-500/30 cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => item.amount > 1 ? updateCheckoutItemAmount(item.productId, -1) : removeCheckoutItem(item.productId)}
                    >
                      <div className="flex gap-3 items-center">
                        <span className="font-bold text-lg text-blue-600 bg-background w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-blue-500/20">{item.amount}</span>
                        <span className="font-bold text-blue-600 text-lg">{item.name}</span>
                      </div>
                      <span className="font-bold text-blue-600">{(item.price * item.amount).toFixed(2)}€</span>
                    </div>
                  ))}
                  {checkoutItems.length === 0 && (
                    <div className="py-8 text-center text-blue-600/50 flex flex-col items-center">
                      <Receipt className="w-8 h-8 mb-2" />
                      <p className="text-sm">Tippe oben auf Artikel um sie hinzuzufügen</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 shrink-0 flex gap-2 h-16">
              <Button variant="outline" className="w-20 h-full rounded-2xl bg-background" onClick={() => { setCheckoutItems([]); setMode("menu"); }}>
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className={`flex-1 h-full rounded-2xl text-xl font-bold active:scale-95 transition-transform shadow-md ${checkoutItems.length > 0 ? "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600" : "bg-muted-foreground text-background"}`}
                    disabled={checkoutItems.length === 0}
                  >
                    <CheckCircle2 className="mr-2 w-6 h-6" />
                    {checkoutItems.length > 0 ? "KASSIEREN" : "Schließen"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[90%] sm:max-w-[425px] rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Barzahlung bestätigen</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="mt-2 text-base">
                        Bitte bestätige den Erhalt von <strong className="text-foreground font-bold text-lg">{checkoutTotal.toFixed(2)}€</strong> in Bar.
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
                    <AlertDialogCancel className="flex-1 mt-0">Abbrechen</AlertDialogCancel>
                    <AlertDialogAction className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleCheckoutConfirm}>Kassieren</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top: Aktuelle Bestellungen */}
          <div className="flex-[3] p-4 flex flex-col overflow-hidden min-h-[40vh] max-h-[50vh]">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-xl font-bold tracking-tight">Tischübersicht</h2>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
                Tisch {table}
              </span>
            </div>

            <div className="bg-background rounded-2xl shadow-sm border p-4 flex-1 flex flex-col overflow-hidden">
              <h3 className="font-semibold text-muted-foreground mb-2 text-xs uppercase tracking-wider shrink-0">
                Aktuelle Rechnung
              </h3>

              <div className="flex-1 overflow-y-auto w-full pr-2">
                <div className="flex flex-col gap-2">

                  {/* Bonierte Bestellungen */}
                  {existingOrders.map((item) => {
                    const checkoutAmount = checkoutItems.find(c => c.productId === item.productId)?.amount || 0;
                    const displayAmount = item.amount - checkoutAmount;
                    if (displayAmount <= 0) return null;
                    return (
                      <div key={`existing-${item.productId}`} className="flex justify-between items-center py-2 border-b border-border/40">
                        <div className="flex gap-2">
                          <span className="font-bold">{displayAmount}x</span>
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium text-muted-foreground">
                          {(item.price * displayAmount).toFixed(2)}€
                        </span>
                      </div>
                    );
                  })}



                  {/* Neue (noch nicht bonierte) Bestellungen */}
                  {newItems.map((item) => (
                    <div key={`new-${item.productId}`} className="flex justify-between items-center py-3 px-2 bg-primary/5 rounded-xl border border-primary/20 mt-1 relative">
                      <div className="flex gap-2 items-center flex-1">
                        <div className="flex items-center bg-background border rounded-lg mr-2 shadow-sm shrink-0">
                          <Button
                            variant="ghost"
                            className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-primary/20 active:bg-primary/30"
                            onClick={() => item.amount > 1 ? updateNewItemAmount(item.productId, -1) : removeNewItem(item.productId)}
                          >
                            {item.amount > 1 ? <Minus className="w-3 h-3" /> : <Trash2 className="w-3 h-3 text-destructive" />}
                          </Button>
                          <span className="w-6 text-center font-bold text-sm">{item.amount}</span>
                          <Button
                            variant="ghost"
                            className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary/20 active:bg-primary/30"
                            onClick={() => updateNewItemAmount(item.productId, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="font-bold">{item.name}</span>
                      </div>
                      <span className="font-bold text-primary shrink-0">
                        {(item.price * item.amount).toFixed(2)}€
                      </span>
                    </div>
                  ))}

                  {/* Retoure-Positionen (rot markiert) */}
                  {returnItems.map((item) => (
                    <div key={`ret-${item.productId}`} className="flex justify-between items-center py-3 px-2 bg-destructive/5 rounded-xl border border-destructive/30 mt-1 relative">
                      <div className="flex gap-2 items-center flex-1">
                        <div className="flex items-center bg-background border border-destructive/20 rounded-lg mr-2 shadow-sm shrink-0">
                          <Button
                            variant="ghost"
                            className="w-8 h-8 flex items-center justify-center hover:bg-destructive/10 active:bg-destructive/20"
                            onClick={() => item.amount > 1 ? updateReturnItemAmount(item.productId, -1) : removeReturnItem(item.productId)}
                          >
                            {item.amount > 1 ? <Minus className="w-3 h-3 text-destructive" /> : <Trash2 className="w-3 h-3 text-destructive" />}
                          </Button>
                          <span className="w-6 text-center font-bold text-sm text-destructive">{item.amount}</span>
                          <Button
                            variant="ghost"
                            className="w-8 h-8 flex items-center justify-center hover:bg-destructive/10 active:bg-destructive/20"
                            onClick={() => updateReturnItemAmount(item.productId, 1)}
                          >
                            <Plus className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                        <span className="font-bold text-destructive">{item.name}</span>
                      </div>
                      <span className="font-bold text-destructive shrink-0">
                        -{(item.price * item.amount).toFixed(2)}€
                      </span>
                    </div>
                  ))}

                  {existingOrders.length === 0 && newItems.length === 0 && returnItems.length === 0 && checkoutItems.length === 0 && !isLoading && (
                    <div className="py-8 text-center text-muted-foreground opacity-50 flex flex-col items-center">
                      <Receipt className="w-8 h-8 mb-2" />
                      <p className="text-sm">Noch keine Artikel gebucht</p>

                    </div>
                  )}
                  {isLoading && (
                    <div className="py-8 text-center text-muted-foreground opacity-50 flex flex-col items-center">
                      <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                      <p className="text-sm">Lade Artikel...</p>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t shrink-0 flex justify-between items-center">
                <span className="font-bold text-lg">Summe</span>
                <span className="font-bold text-2xl text-primary">{totalAmount.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Bottom: Menü / Bestellen / Retoure */}
          <div className="flex-[4] sm:flex-[3] bg-background/95 backdrop-blur shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t flex flex-col overflow-hidden">

            {/* STATE A: Hauptmenü */}
            {mode === "menu" && (
              <div className="p-4 flex-1 grid grid-cols-2 grid-rows-2 gap-4">
                <Button
                  className="h-full rounded-2xl text-xl font-bold bg-primary active:scale-95 transition-transform shadow-md flex-col gap-2"
                  onClick={() => setMode("ordering")}
                >
                  <PlusCircle className="w-8 h-8" />
                  Bestellen
                </Button>

                <Button
                  variant="outline"
                  className="h-full rounded-2xl text-xl font-bold border-2 active:bg-accent active:scale-95 transition-transform flex-col gap-2"
                  onClick={() => setMode("checkout")}
                >
                  <Receipt className="w-8 h-8" />
                  Abrechnen
                </Button>

                <Button
                  variant="outline"
                  className="h-full rounded-2xl text-lg font-bold border-2 active:bg-accent active:scale-95 transition-transform flex-col gap-2"
                  onClick={onBack}
                >
                  <ArrowLeft className="w-8 h-8" />
                  Zurück
                </Button>

                <Button
                  variant="outline"
                  className="h-full rounded-2xl text-lg font-bold border-2 text-destructive hover:text-destructive active:bg-destructive/10 active:scale-95 transition-transform flex-col gap-2"
                  onClick={() => setMode("returning")}
                  disabled={existingOrders.length === 0}
                >
                  <RefreshCcw className="w-8 h-8" />
                  Retoure
                </Button>
              </div>
            )}

            {/* STATE B: Produkt-Grid (Bestellen) */}
            {mode === "ordering" && (
              <div className="p-2 pt-3 flex-1 flex flex-col overflow-hidden h-full">
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                  {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-semibold">
                      Produkte laden...
                    </div>
                  ) : products.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 text-center">
                      <p>Es sind noch keine Produkte angelegt.<br />Erstelle in den Settings neue Produkte.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {products.map((p) => {
                        const orderedCount = newItems.find((i) => i.productId === p.id)?.amount || 0;
                        return (
                          <Button
                            key={p.id}
                            variant="outline"
                            className="relative h-24 text-base sm:text-lg font-bold rounded-2xl flex flex-col gap-1 bg-background active:scale-95 transition-transform shadow-sm border-2 overflow-hidden"
                            style={{ borderColor: p.categoryColor, backgroundColor: `${p.categoryColor}1A` }}
                            onClick={() => addNewItem(p)}
                          >
                            <span className="break-words px-1 text-center whitespace-normal leading-tight">{p.name}</span>
                            {orderedCount > 0 && (
                              <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                                {orderedCount}
                              </div>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-2 pt-0 shrink-0 flex gap-2 h-16 mt-2">
                  <Button
                    variant="outline"
                    className="w-20 h-full rounded-2xl"
                    onClick={() => setMode("menu")}
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    className={`flex-1 h-full rounded-2xl text-xl font-bold active:scale-95 transition-transform shadow-md ${newItems.length > 0 ? "bg-primary" : "bg-muted-foreground"}`}
                    onClick={saldo}
                  >
                    <CheckCircle2 className="mr-2 w-6 h-6" />
                    {newItems.length > 0 ? "SALDO" : "Schließen"}
                  </Button>
                </div>
              </div>
            )}

            {/* STATE C: Produkt-Grid (Retoure) – gleiche Struktur, aber rot */}
            {mode === "returning" && (
              <div className="p-2 pt-3 flex-1 flex flex-col overflow-hidden h-full">
                {/* Roter Hinweis-Banner */}
                <div className="mx-2 mb-2 px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-xl shrink-0">
                  <p className="text-xs font-semibold text-destructive text-center tracking-wide uppercase">
                    Warenretoure
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-2">
                  <div className="grid grid-cols-3 gap-2">
                    {existingOrders.map((p) => {
                      const returnCount = returnItems.find((i) => i.productId === p.productId)?.amount || 0;
                      const remaining = p.amount - returnCount;

                      return (
                        <Button
                          key={p.productId}
                          variant="outline"
                          className={`relative h-24 text-base sm:text-lg font-bold rounded-2xl flex flex-col gap-1 active:scale-95 transition-transform shadow-sm border-2 ${returnCount > 0
                            ? "bg-destructive/5 border-destructive/40 text-destructive active:border-destructive"
                            : "bg-background active:border-destructive/60"
                            }`}
                          onClick={() => addReturnItem(p.productId, p.name, p.price)}
                          disabled={remaining <= 0}
                        >
                          <span className="break-words px-1 text-center whitespace-normal leading-tight">{p.name}</span>
                          {returnCount > 0 && (
                            <div className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                              {returnCount}
                            </div>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-2 pt-0 shrink-0 flex gap-2 h-16 mt-2">
                  <Button
                    variant="outline"
                    className="w-20 h-full rounded-2xl"
                    onClick={() => { setReturnItems([]); setMode("menu"); }}
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    className={`flex-1 h-full rounded-2xl text-xl font-bold active:scale-95 transition-transform shadow-md ${returnItems.length > 0
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      : "bg-muted-foreground"
                      }`}
                    onClick={saldo}
                  >
                    <CheckCircle2 className="mr-2 w-6 h-6" />
                    {returnItems.length > 0 ? "SALDO" : "Schließen"}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}