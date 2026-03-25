"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type OrderItem = {
  productId: string;
  name: string;
  amount: number;
};

type Product = {
  id: string;
  name: string;
};

type Props = {
  waiterId: string;
  table: number;
  onBack?: () => void;
};

export function OrderStep({ waiterId, table, onBack }: Props) {
  const [items, setItems] = useState<OrderItem[]>([]);

  // 🔧 TEMP: statische Produkte (später vom Backend)
  const products: Product[] = [
    { id: "beer", name: "Bier" },
    { id: "cola", name: "Cola" },
    { id: "water", name: "Wasser" },
  ];

  function addItem(product: Product) {
    setItems((prev) => {
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
        { productId: product.id, name: product.name, amount: 1 },
      ];
    });
  }

  function submitOrder() {
    console.log({
      waiterId,
      table,
      items,
    });

    // später:
    // fetch("/order", ...)

    setItems([]);
  }

  return (
    <div className="p-4 max-w-md mx-auto flex flex-col gap-4">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Bestellung</h1>
        <p className="text-sm text-gray-500">
          Kellner: {waiterId} | Tisch: {table}
        </p>
      </div>

      {/* Produkte */}
      <div className="grid grid-cols-2 gap-2">
        {products.map((p) => (
          <Button
            key={p.id}
            className="h-16 text-lg"
            onClick={() => addItem(p)}
          >
            {p.name}
          </Button>
        ))}
      </div>

      {/* Warenkorb */}
      <div className="border rounded-xl p-3">
        <h2 className="font-semibold mb-2">Bestellung</h2>

        {items.length === 0 && (
          <p className="text-sm text-gray-500">Noch nichts ausgewählt</p>
        )}

        {items.map((item) => (
          <div key={item.productId} className="flex justify-between">
            <span>{item.name}</span>
            <span>{item.amount}x</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        {onBack && (
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Zurück
          </Button>
        )}

        <Button
          className="flex-1"
          onClick={submitOrder}
          disabled={items.length === 0}
        >
          Bestellen
        </Button>
      </div>
    </div>
  );
}