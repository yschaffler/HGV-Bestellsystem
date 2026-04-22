import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { ProductForm } from "@/components/settings/ProductForm";
import type { Product } from "@/app/settings/types";

export type ProductRowProps = {
  product: Product;
  categories: string[];
  onUpdate: (p: Product) => void;
  onRequestDelete: (id: string, name: string) => void;
};

export function ProductRow({ product, categories, onUpdate, onRequestDelete }: ProductRowProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ProductForm
        initial={product}
        categories={categories}
        onSave={(updated) => {
          onUpdate({ ...updated, id: product.id });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground">{product.category}</p>
      </div>
      <Badge variant="secondary" className="font-bold shrink-0">
        {product.price.toFixed(2)} €
      </Badge>
      <div className="flex gap-1 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 hover:bg-primary/10 hover:text-primary"
          onClick={() => setEditing(true)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRequestDelete(product.id, product.name)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
