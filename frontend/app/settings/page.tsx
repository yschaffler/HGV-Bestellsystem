"use client"
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PlusCircle,
  Trash2,
  Pencil,
  Check,
  X,
  UtensilsCrossed,
  Settings2,
  Layers,
  GripVertical,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type DeleteDialog =
  | { type: "product"; id: string; name: string }
  | { type: "category"; name: string }
  | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_CATEGORIES = ["Getränke", "Speisen", "Desserts", "Sonstiges"];

const INITIAL_PRODUCTS: Product[] = [
  { id: uid(), name: "Bier", price: 4.5, category: "Getränke" },
  { id: uid(), name: "Cola", price: 3.5, category: "Getränke" },
  { id: uid(), name: "Wasser", price: 3.0, category: "Getränke" },
  { id: uid(), name: "Schnitzel", price: 14.9, category: "Speisen" },
];

// ─── Product Form (inline) ────────────────────────────────────────────────────

type ProductFormProps = {
  initial?: Partial<Product>;
  categories: string[];
  onSave: (p: Omit<Product, "id">) => void;
  onCancel: () => void;
};

function ProductForm({ initial, categories, onSave, onCancel }: ProductFormProps) {
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

// ─── Product Row ──────────────────────────────────────────────────────────────

type ProductRowProps = {
  product: Product;
  categories: string[];
  onUpdate: (p: Product) => void;
  onRequestDelete: (id: string, name: string) => void;
};

function ProductRow({ product, categories, onUpdate, onRequestDelete }: ProductRowProps) {
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Settingspage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>("Alle");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>(null);

  const allCategories = ["Alle", ...categories];
  const filteredProducts =
    activeCategory === "Alle"
      ? products
      : products.filter((p) => p.category === activeCategory);

  // ─── Product actions ───────────────────────────────────────────────────────

  function addProduct(p: Omit<Product, "id">) {
    setProducts((prev) => [...prev, { ...p, id: uid() }]);
    setShowAddProduct(false);
  }

  function updateProduct(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function requestDeleteProduct(id: string, name: string) {
    setDeleteDialog({ type: "product", id, name });
  }

  // ─── Category actions ──────────────────────────────────────────────────────

  function addCategory() {
    const trimmed = newCategoryInput.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories((prev) => [...prev, trimmed]);
    setNewCategoryInput("");
    setShowAddCategory(false);
  }

  function requestDeleteCategory(name: string) {
    setDeleteDialog({ type: "category", name });
  }

  // ─── Confirm / cancel dialog ───────────────────────────────────────────────

  function confirmDelete() {
    if (!deleteDialog) return;
    if (deleteDialog.type === "product") {
      setProducts((prev) => prev.filter((p) => p.id !== deleteDialog.id));
    }
    if (deleteDialog.type === "category") {
      setCategories((prev) => prev.filter((c) => c !== deleteDialog.name));
      if (activeCategory === deleteDialog.name) setActiveCategory("Alle");
    }
    setDeleteDialog(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-muted/10 pb-20">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Einstellungen</h1>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-6">

          {/* ── Produkte ─────────────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Produkte</CardTitle>
                  <CardDescription>{products.length} Artikel angelegt</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">

              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="flex flex-wrap h-auto gap-1 w-full">
                  {allCategories.map((cat) => (
                    <TabsTrigger key={cat} value={cat}>
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {allCategories.map((cat) => {
                  const tabProducts =
                    cat === "Alle"
                      ? products
                      : products.filter((p) => p.category === cat);
                  return (
                    <TabsContent key={cat} value={cat} className="mt-4">
                      {tabProducts.length > 0 ? (
                        tabProducts.map((p) => (
                          <ProductRow
                            key={p.id}
                            product={p}
                            categories={categories}
                            onUpdate={updateProduct}
                            onRequestDelete={requestDeleteProduct}
                          />
                        ))
                      ) : (
                        <p className="py-8 text-center text-muted-foreground text-sm opacity-50">
                          Keine Produkte in dieser Kategorie
                        </p>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>

              {/* Produkt hinzufügen */}
              {showAddProduct ? (
                <ProductForm
                  categories={categories}
                  onSave={addProduct}
                  onCancel={() => setShowAddProduct(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setShowAddProduct(true)}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Produkt hinzufügen
                </Button>
              )}
            </CardContent>
          </Card>

          {/* ── Kategorien ───────────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Kategorien</CardTitle>
                  <CardDescription>Produktgruppen verwalten</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">

              <div>
                {categories.map((cat) => {
                  const productCount = products.filter((p) => p.category === cat).length;
                  const canDelete = productCount === 0;

                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0"
                    >
                      <span className="text-sm font-medium">{cat}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {productCount} Artikel
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 hover:bg-destructive/10 hover:text-destructive"
                                disabled={!canDelete}
                                onClick={() => canDelete && requestDeleteCategory(cat)}
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
                  );
                })}
              </div>

              {/* Kategorie hinzufügen */}
              {showAddCategory ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                    placeholder="Kategoriename"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive shrink-0"
                    onClick={() => { setShowAddCategory(false); setNewCategoryInput(""); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="icon" className="shrink-0" onClick={addCategory}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setShowAddCategory(true)}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Kategorie hinzufügen
                </Button>
              )}
            </CardContent>
          </Card>

        </div>


        {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
        <AlertDialog
          open={!!deleteDialog}
          onOpenChange={(open) => !open && setDeleteDialog(null)}
        >
          <AlertDialogContent className="max-w-sm">

            {/* Content */}
            <div className="flex flex-col items-center text-center gap-4">

              {/* Icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>

              {/* Text */}
              <AlertDialogHeader className="text-center">
                <AlertDialogTitle className="text-center">
                  {deleteDialog?.type === "product"
                    ? "Produkt löschen?"
                    : "Kategorie löschen?"}
                </AlertDialogTitle>

                <AlertDialogDescription className="text-center">
                  „
                  <span className="font-medium text-foreground">
                    {deleteDialog?.name}
                  </span>
                  “ wird dauerhaft entfernt.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>

            {/* Actions */}
            <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
              <AlertDialogCancel className="flex-1">
                Abbrechen
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={confirmDelete}
                className="flex-1"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>

          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}