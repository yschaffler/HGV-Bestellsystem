"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Receipt, ArrowLeft, RefreshCcw, CheckCircle2, Minus, Plus, Trash2 } from "lucide-react";

type OrderItem = {
  productId: string;
  name: string;
  amount: number;
  price: number;
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
};

type Props = {
  waiterId: string;
  table: number;
  onCheckout: () => void;
  onReturn: () => void;
  onBack: () => void;
};

export function TableOverviewStep({ table, onCheckout, onReturn, onBack }: Props) {
  const [isOrdering, setIsOrdering] = useState(false);
  const [newItems, setNewItems] = useState<OrderItem[]>([]);

  // TEMP: statische existierende Bestellungen (später vom Backend)
  const existingOrders = [
    { id: "1", name: "Bier", amount: 2, price: 4.50 },
    { id: "2", name: "Cola", amount: 1, price: 3.50 },
  ];

  // TEMP: statische Produkte (später vom Backend)
  const products: Product[] = [
    { id: "beer", name: "Bier", category: "Getränke", price: 4.50 },
    { id: "cola", name: "Cola", category: "Getränke", price: 3.50 },
    { id: "water", name: "Wasser", category: "Getränke", price: 3.00 },
    { id: "wine", name: "Wein", category: "Getränke", price: 5.50 },
    { id: "soda", name: "Spezi", category: "Getränke", price: 3.50 },
    { id: "apfelschorle", name: "Apfelschorle", category: "Getränke", price: 3.50 },


  ];

  const existingTotal = existingOrders.reduce((sum, item) => sum + (item.price * item.amount), 0);
  const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.amount), 0);
  const totalAmount = existingTotal + newTotal;

  function addNewItem(product: Product) {
    setNewItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, amount: i.amount + 1 }
            : i
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, amount: 1, price: product.price },
      ];
    });
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function updateNewItemAmount(productId: string, delta: number) {
    setNewItems((prev) => {
      return prev.map((i) => {
        if (i.productId === productId) {
          const updatedAmount = i.amount + delta;
          if (updatedAmount <= 0) return i; // Prevent <= 0, handled by remove
          return { ...i, amount: updatedAmount };
        }
        return i;
      });
    });
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function removeNewItem(productId: string) {
    setNewItems((prev) => prev.filter((i) => i.productId !== productId));
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function submitOrder() {
    if (newItems.length === 0) {
      // Wenn nichts neues da ist und trotzdem Saldo gedrückt wird, einfach abbrechen/schließen
      setIsOrdering(false);
      return;
    }

    console.log({
      table,
      newItems,
    });

    if (navigator.vibrate) navigator.vibrate([20, 50, 20]);

    // fetch("/order", ...) // backend request 
    setNewItems([]);
    setIsOrdering(false);

    // Automatisch zurück zur Tischauswahl nach dem Bonierten
    onBack();
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] bg-muted/10 overflow-hidden">

      {/* Top Section: Aktuelle Bestellungen (Immer sichtbar, scrollbar) */}
      <div className="flex-[3] p-4 flex flex-col overflow-hidden min-h-[40vh]">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-xl font-bold tracking-tight">Tischübersicht</h2>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
            Tisch {table}
          </span>
        </div>

        <div className="bg-background rounded-2xl shadow-sm border p-4 flex-1 flex flex-col overflow-hidden">
          <h3 className="font-semibold text-muted-foreground mb-2 text-xs uppercase tracking-wider shrink-0">Aktuelle Rechnung</h3>

          <div className="flex-1 overflow-y-auto w-full pr-2">
            <div className="flex flex-col gap-2">

              {/* Existierende Bestellungen (Boniert) */}
              {existingOrders.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/40">
                  <div className="flex gap-2">
                    <span className="font-bold">{item.amount}x</span>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium text-muted-foreground">
                    {(item.price * item.amount).toFixed(2)}€
                  </span>
                </div>
              ))}

              {/* Neue Bestellungen (Nicht boniert) */}
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
                      <span className="w-6 text-center font-bold text-sm">
                        {item.amount}
                      </span>
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

              {existingOrders.length === 0 && newItems.length === 0 && (
                <div className="py-8 text-center text-muted-foreground opacity-50 flex flex-col items-center">
                  <Receipt className="w-8 h-8 mb-2" />
                  <p className="text-sm">Noch keine Artikel gebucht</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t shrink-0 flex justify-between items-center">
            <span className="font-bold text-lg">Summe</span>
            <span className="font-bold text-2xl text-primary">{totalAmount.toFixed(2)}€</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Flexible (Menü ODER Produktwahl) */}
      <div className="flex-[4] sm:flex-[3] bg-background/95 backdrop-blur shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t flex flex-col overflow-hidden">
        {!isOrdering ? (
          <div className="p-4 flex-1 grid grid-cols-2 grid-rows-2 gap-4">
            <Button
              className="h-full rounded-2xl text-xl font-bold bg-primary active:scale-95 transition-transform shadow-md flex-col gap-2"
              onClick={() => setIsOrdering(true)}
            >
              <PlusCircle className="w-8 h-8" />
              Bestellen
            </Button>

            <Button
              variant="outline"
              className="h-full rounded-2xl text-xl font-bold border-2 active:bg-accent active:scale-95 transition-transform flex-col gap-2"
              onClick={onCheckout}
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
              onClick={onReturn}
            >
              <RefreshCcw className="w-8 h-8" />
              Retoure
            </Button>
          </div>
        ) : (
          /* STATE B: Produkt-Grid & SALDO */
          <div className="p-2 pt-3 flex-1 flex flex-col overflow-hidden h-full">
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="grid grid-cols-3 gap-2">
                {products.map((p) => {
                  const orderedCount = newItems.find((i) => i.productId === p.id)?.amount || 0;
                  return (
                    <Button
                      key={p.id}
                      variant="outline"
                      className="relative h-24 text-base sm:text-lg font-bold rounded-2xl flex flex-col gap-1 bg-background active:scale-95 transition-transform shadow-sm border-2 active:border-primary"
                      onClick={() => addNewItem(p)}
                    >
                      <span className="break-words px-1 text-center whitespace-normal leading-tight">{p.name}</span>
                      {orderedCount > 0 && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                          {orderedCount}
                        </div>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="p-2 pt-0 shrink-0 flex gap-2 h-16 mt-2">
              <Button
                variant="outline"
                className="w-20 h-full rounded-2xl"
                onClick={() => setIsOrdering(false)}
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <Button
                className={`flex-1 h-full rounded-2xl text-xl font-bold active:scale-95 transition-transform shadow-md ${newItems.length > 0 ? "bg-primary" : "bg-muted-foreground"}`}
                onClick={submitOrder}
              >
                <CheckCircle2 className="mr-2 w-6 h-6" />
                {newItems.length > 0 ? "SALDO" : "Schließen"}
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
