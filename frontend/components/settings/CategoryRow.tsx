import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CategoryForm } from "@/components/settings/CategoryForm";
import type { Category } from "@/app/settings/types";

export type CategoryRowProps = {
  category: Category;
  productCount: number;
  onUpdate: (c: Category) => void;
  onRequestDelete: (name: string) => void;
};

export function CategoryRow({ category, productCount, onUpdate, onRequestDelete }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const canDelete = productCount === 0;

  if (editing) {
    return (
      <CategoryForm
        initial={category}
        onSave={(updated) => {
          onUpdate({ ...updated, id: category.id });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0 group">
      <div className="flex items-center gap-3">
        <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" style={{ backgroundColor: category.color || "#e2e8f0" }} />
        <span className="text-sm font-medium">{category.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {productCount} Artikel
        </Badge>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 hover:bg-primary/10 hover:text-primary"
            onClick={() => setEditing(true)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 hover:bg-destructive/10 hover:text-destructive"
                  disabled={!canDelete}
                  onClick={() => canDelete && onRequestDelete(category.name)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </span>
            </TooltipTrigger>
            {!canDelete && (
              <TooltipContent side="left">
                <p>Erst alle Produkte aus dieser Kategorie entfernen.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
