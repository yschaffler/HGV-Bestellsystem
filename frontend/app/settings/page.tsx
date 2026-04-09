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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerAlpha,
  ColorPickerFormat,
} from "@/components/ui/color-picker"
import Color from "color";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type Category = {
  id: string;
  name: string;
  color: string;
};

type DeleteDialog =
  | { type: "product"; id: string; name: string }
  | { type: "category"; name: string }
  | null;


type ApiCategory = { category_id: number; category_name: string };
type ApiProduct = { product_id: number; price: number; name: string; category: number };

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

// ─── Category Form (inline) ────────────────────────────────────────────────────
// Für jede Kategorie kann ein Name und optional eine Farbe ausgewählt werden

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#10b981", "#06b6d4", "#3b82f6",
  "#6366f1", "#d946ef", "#f43f5e", "#64748b"
];

type CategoryFormProps = {
  initial?: Partial<Category>;
  onSave: (p: Omit<Category, "id">) => void;
  onCancel: () => void;
};

function CategoryForm({ initial, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color?.toString() ?? PRESET_COLORS[0]);

  const valid = name.trim().length > 0 && color.trim().length > 0;

  function handleSave() {
    if (!valid) return;
    onSave({ name: name.trim(), color: color.trim() });
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-4 mt-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-name">Name</Label>
        <Input
          id="category-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Getränke"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Kategoriefarbe</Label>
        <div className="flex flex-wrap gap-2 mt-1 relative">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 focus:outline-none transition-all ${color === c
                ? "border-primary scale-110 shadow-sm"
                : "border-transparent hover:scale-105"
                }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`w-8 h-8 rounded-full border-2 flex flex-shrink-0 items-center justify-center cursor-pointer transition-all ${
                  !PRESET_COLORS.includes(color)
                    ? "border-primary scale-110 shadow-sm"
                    : "border-dashed border-muted-foreground/50 hover:bg-muted/50 hover:scale-105 bg-background"
                }`}
                style={!PRESET_COLORS.includes(color) ? { backgroundColor: color } : {}}
                title="Eigene Farbe"
              >
                {!PRESET_COLORS.includes(color) ? null : <PlusCircle className="w-4 h-4 text-muted-foreground" />}
                <span className="sr-only">Eigene Farbe wählen</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 align-start" align="start">
              <ColorPicker
                value={color}
                onChange={(rgbaArray) => {
                  try {
                    setColor(Color.rgb(rgbaArray).hex());
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-56"
              >
                <ColorPickerSelection className="h-40 rounded-lg mb-3" />
                <ColorPickerHue />
                <ColorPickerAlpha />
                <div className="mt-3">
                  <ColorPickerFormat />
                </div>
              </ColorPicker>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, number>>(new Map());
  const [activeCategory, setActiveCategory] = useState<string>("Alle");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    async function fetchInitialData() {
      try {
        const catRes = await fetch("/get/all-categories/");
        const prodRes = await fetch("/get/all-products/");
        if (!catRes.ok || !prodRes.ok) throw new Error("Daten konnten nicht vom Server geladen werden.");

        const catData: ApiCategory[] = await catRes.json();
        const prodData: ApiProduct[] = await prodRes.json();

        const cMap = new Map<string, number>();
        const rMap = new Map<number, string>();
        const cats: string[] = [];

        catData.forEach(c => {
          cMap.set(c.category_name, c.category_id);
          rMap.set(c.category_id, c.category_name);
          cats.push(c.category_name);
        });

        setCategoryMap(cMap);
        setCategories(cats);

        const MAPPED_PRODUCTS: Product[] = prodData.map(p => ({
          id: p.product_id.toString(),
          name: p.name,
          category: rMap.get(p.category) || "Unbekannt",
          price: p.price,
        }));
        setProducts(MAPPED_PRODUCTS);
      } catch (err) {
        console.error(err);
        setError("Fehler beim Verbinden mit dem Server. Bitte lade die Seite neu.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  const allCategories = ["Alle", ...categories];
  const filteredProducts =
    activeCategory === "Alle"
      ? products
      : products.filter((p) => p.category === activeCategory);

  // ─── Product actions ───────────────────────────────────────────────────────

  async function addProduct(p: Omit<Product, "id">) {
    try {
      const catId = categoryMap.get(p.category) || 0;
      const res = await fetch("/add/product/", {
        method: "POST",
        body: JSON.stringify({ price: p.price, name: p.name, category: catId })
      });
      if (!res.ok) throw new Error("Konnte Produkt nicht speichern");
      window.location.reload();
    } catch (err) {
      setError("Fehler beim Speichern des Produkts");
    }
  }

  async function updateProduct(updated: Product) {
    try {
      const catId = categoryMap.get(updated.category) || 0;
      const res = await fetch("/update/product/", {
        method: "POST",
        body: JSON.stringify({ product_id: parseInt(updated.id), price: updated.price, name: updated.name, category: catId })
      });
      if (!res.ok) throw new Error("Konnte Produkt nicht updaten");
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError("Fehler beim Updaten des Produkts");
    }
  }

  function requestDeleteProduct(id: string, name: string) {
    setDeleteDialog({ type: "product", id, name });
  }

  // ─── Category actions ──────────────────────────────────────────────────────

  async function addCategory(newCat: Omit<Category, "id">) {
    const trimmed = newCat.name.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    try {
      const res = await fetch("/add/category/", {
        method: "POST",
        body: JSON.stringify({ category_name: trimmed, color: newCat.color })
      });
      if (!res.ok) throw new Error("Konnte Kategorie nicht speichern");
      window.location.reload();
    } catch (err) {
      setError("Fehler beim Speichern der Kategorie");
    }
  }

  function requestDeleteCategory(name: string) {
    setDeleteDialog({ type: "category", name });
  }

  // ─── Confirm / cancel dialog ───────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteDialog) return;
    setError(null);
    try {
      if (deleteDialog.type === "product") {
        const res = await fetch("/delete/product/", {
          method: "POST",
          body: JSON.stringify({ product_id: parseInt(deleteDialog.id) })
        });
        if (!res.ok) throw new Error("Netzwerkfehler");
        setProducts((prev) => prev.filter((p) => p.id !== deleteDialog.id));
      }
      if (deleteDialog.type === "category") {
        const cId = categoryMap.get(deleteDialog.name);
        if (cId !== undefined) {
          const res = await fetch("/delete/category/", {
            method: "POST",
            body: JSON.stringify({ category_id: cId })
          });
          if (!res.ok) throw new Error("Netzwerkfehler");
        }
        setCategories((prev) => prev.filter((c) => c !== deleteDialog.name));
        if (activeCategory === deleteDialog.name) setActiveCategory("Alle");
      }
    } catch (err) {
      setError("Löschen fehlgeschlagen");
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

        {error && (
          <div className="bg-destructive text-destructive-foreground px-4 py-2 font-bold text-center z-50 sticky top-[57px]">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[40vh] text-center">
            <div className="text-muted-foreground font-semibold">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
              Wird geladen...
            </div>
          </div>
        ) : (
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
                  <CategoryForm onSave={addCategory} onCancel={() => setShowAddCategory(false)} />
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
        )}


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