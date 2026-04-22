import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X } from "lucide-react";
import type { Product } from "@/app/settings/types";

export type ProductFormProps = {
  initial?: Partial<Product>;
  categories: string[];
  onSave: (p: Omit<Product, "id">) => void;
  onCancel: () => void;
};

export function ProductForm({ initial, categories, onSave, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0]);

  const valid = name.trim().length > 0 && parseFloat(price) > 0;

  function handleSave() {
    if (!valid) return;
    onSave({ name: name.trim(), price: parseFloat(price), category });
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-4 mt-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-name">Name</Label>
        <Input
          id="product-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Apfelschorle"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-price">Preis</Label>
        <div className="relative">
          <Input
            id="product-price"
            type="number"
            min="0"
            step="0.10"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="pr-7"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            €
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Kategorie</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Abbrechen
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={!valid}>
          <Check className="w-4 h-4 mr-1" /> Speichern
        </Button>
      </div>
    </div>
  );
}
