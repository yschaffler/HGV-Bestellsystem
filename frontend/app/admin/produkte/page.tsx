"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PlusCircle, Pencil, Trash2, ChevronUp, ChevronDown,
  UtensilsCrossed, Layers, CheckCircle2, Loader2,
} from "lucide-react";
import type { Product, Category, ApiProduct, ApiCategory } from "@/app/settings/types";

// ── Product Dialog ─────────────────────────────────────────────────────────────

type ProductDialogMode = { kind: "create" } | { kind: "edit"; product: Product };

function ProductDialog({
  mode,
  categories,
  onClose,
  onSave,
}: {
  mode: ProductDialogMode | null;
  categories: Category[];
  onClose: () => void;
  onSave: (p: Omit<Product, "id">, id?: string) => Promise<string | null>;
}) {
  const isEdit = mode?.kind === "edit";
  const initial = mode?.kind === "edit" ? mode.product : undefined;

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mode) return;
    setName(initial?.name ?? "");
    setPrice(initial?.price !== undefined ? initial.price.toString() : "");
    setCategory(initial?.category ?? (categories[0]?.name ?? ""));
    setError(null);
    setSavedCount(0);
    setTimeout(() => nameRef.current?.focus(), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const priceNum = parseFloat(price.replace(",", "."));
  const valid = name.trim().length > 0 && !isNaN(priceNum) && priceNum >= 0 && category.length > 0;

  async function handleSave(andClose: boolean) {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const err = await onSave(
      { name: name.trim(), price: priceNum, category },
      isEdit ? initial!.id : undefined,
    );
    setSaving(false);
    if (err) { setError(err); return; }
    if (andClose) { onClose(); return; }
    setName("");
    setPrice("");
    setCategory(categories[0]?.name ?? "");
    setSavedCount(c => c + 1);
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  return (
    <Dialog open={!!mode} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Produkt bearbeiten" : "Produkt erstellen"}</DialogTitle>
        </DialogHeader>

        {savedCount > 0 && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {savedCount} Produkt{savedCount !== 1 ? "e" : ""} erfolgreich erstellt
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dlg-name">Name</Label>
            <Input
              id="dlg-name"
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave(!isEdit)}
              placeholder="z.B. Schnitzel"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dlg-price">Preis (€)</Label>
            <Input
              id="dlg-price"
              value={price}
              onChange={e => setPrice(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave(!isEdit)}
              placeholder="0.00"
              inputMode="decimal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          {!isEdit && (
            <Button variant="outline" onClick={() => handleSave(false)} disabled={!valid || saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Speichern & Weiteren"}
            </Button>
          )}
          <Button onClick={() => handleSave(true)} disabled={!valid || saving} className={isEdit ? "w-full" : "flex-1"}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Speichern" : "Fertig"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Category Dialog ────────────────────────────────────────────────────────────

type CategoryDialogMode = { kind: "create" } | { kind: "edit"; category: Category };

function CategoryDialog({
  mode,
  onClose,
  onSave,
}: {
  mode: CategoryDialogMode | null;
  onClose: () => void;
  onSave: (c: Omit<Category, "id">, id?: string) => Promise<string | null>;
}) {
  const isEdit = mode?.kind === "edit";
  const initial = mode?.kind === "edit" ? mode.category : undefined;

  const [catName, setCatName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mode) return;
    setCatName(initial?.name ?? "");
    setColor(initial?.color ?? "#64748b");
    setError(null);
    setSavedCount(0);
    setTimeout(() => nameRef.current?.focus(), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const valid = catName.trim().length > 0;

  async function handleSave(andClose: boolean) {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const err = await onSave({ name: catName.trim(), color }, isEdit ? initial!.id : undefined);
    setSaving(false);
    if (err) { setError(err); return; }
    if (andClose) { onClose(); return; }
    setCatName("");
    setColor("#64748b");
    setSavedCount(c => c + 1);
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  return (
    <Dialog open={!!mode} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kategorie bearbeiten" : "Kategorie erstellen"}</DialogTitle>
        </DialogHeader>

        {savedCount > 0 && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {savedCount} Kategorie{savedCount !== 1 ? "n" : ""} erfolgreich erstellt
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dlg-cat-name">Name</Label>
            <Input
              id="dlg-cat-name"
              ref={nameRef}
              value={catName}
              onChange={e => setCatName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave(!isEdit)}
              placeholder="z.B. Getränke"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dlg-cat-color">Farbe</Label>
            <div className="flex items-center gap-3">
              <input
                id="dlg-cat-color"
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="h-10 w-16 rounded-lg border cursor-pointer p-1"
              />
              <span className="text-sm text-muted-foreground font-mono">{color}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          {!isEdit && (
            <Button variant="outline" onClick={() => handleSave(false)} disabled={!valid || saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Speichern & Weiteren"}
            </Button>
          )}
          <Button onClick={() => handleSave(true)} disabled={!valid || saving} className={isEdit ? "w-full" : "flex-1"}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Speichern" : "Fertig"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProduktePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, number>>(new Map());
  const [activeSection, setActiveSection] = useState<"produkte" | "kategorien">("produkte");
  const [activeCategory, setActiveCategory] = useState<string>("Alle");
  const [productDialog, setProductDialog] = useState<ProductDialogMode | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogMode | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => { fetchInitialData(); }, []);

  async function fetchCategories() {
    const res = await fetch("/get/all-categories/");
    if (!res.ok) throw new Error();
    const catData: ApiCategory[] = await res.json();
    const cMap = new Map<string, number>();
    const rMap = new Map<number, string>();
    const cats: Category[] = [];
    catData.forEach(c => {
      cMap.set(c.category_name, c.category_id);
      rMap.set(c.category_id, c.category_name);
      cats.push({ id: c.category_id.toString(), name: c.category_name, color: c.category_color || "#64748b" });
    });
    setCategoryMap(cMap);
    setCategories(cats);
    return { cMap, rMap };
  }

  async function fetchProducts(rMap: Map<number, string>) {
    const res = await fetch("/get/all-products/");
    if (!res.ok) throw new Error();
    const prodData: ApiProduct[] = await res.json();
    setProducts(prodData.map(p => ({
      id: p.product_id.toString(),
      name: p.name,
      category: rMap.get(p.category) || "Unbekannt",
      price: p.price,
    })));
  }

  async function fetchInitialData() {
    setIsLoading(true);
    try {
      const { rMap } = await fetchCategories();
      await fetchProducts(rMap);
    } catch {
      setPageError("Fehler beim Laden der Daten.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProductSave(p: Omit<Product, "id">, id?: string): Promise<string | null> {
    const isEdit = !!id;
    try {
      const catId = categoryMap.get(p.category) || 0;
      const res = await fetch(isEdit ? "/update/product/" : "/add/product/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: isEdit
          ? JSON.stringify({ product_id: parseInt(id!), price: p.price, name: p.name, category: catId })
          : JSON.stringify({ price: p.price, name: p.name, category: catId }),
      });
      if (!res.ok) throw new Error();
      const rMap = new Map<number, string>();
      categories.forEach(c => rMap.set(parseInt(c.id), c.name));
      await fetchProducts(rMap);
      return null;
    } catch {
      return isEdit ? "Fehler beim Speichern" : "Fehler beim Erstellen";
    }
  }

  async function handleCategorySave(c: Omit<Category, "id">, id?: string): Promise<string | null> {
    const isEdit = !!id;
    const trimmed = c.name.trim();
    if (!trimmed) return "Name darf nicht leer sein";
    if (!isEdit && categories.some(cat => cat.name === trimmed)) return "Kategorie bereits vorhanden";
    try {
      const res = await fetch(isEdit ? "/update/category/" : "/add/category/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: isEdit
          ? JSON.stringify({ category_id: parseInt(id!), category_name: trimmed, category_color: c.color })
          : JSON.stringify({ category_name: trimmed, category_color: c.color }),
      });
      if (!res.ok) throw new Error();
      const { rMap } = await fetchCategories();
      await fetchProducts(rMap);
      return null;
    } catch {
      return isEdit ? "Fehler beim Speichern" : "Fehler beim Erstellen";
    }
  }

  async function moveProduct(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= products.length) return;
    const reordered = [...products];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    setProducts(reordered);
    await fetch("/update/product-order/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map(p => parseInt(p.id)) }),
    });
  }

  async function confirmDeleteProduct() {
    if (!deleteProductId) return;
    try {
      const res = await fetch("/delete/product/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: parseInt(deleteProductId) }),
      });
      if (!res.ok) throw new Error();
      setProducts(prev => prev.filter(p => p.id !== deleteProductId));
    } catch {
      setPageError("Löschen fehlgeschlagen");
    }
    setDeleteProductId(null);
  }

  async function confirmDeleteCategory() {
    if (!deleteCategoryId) return;
    const cat = categories.find(c => c.id === deleteCategoryId);
    try {
      const res = await fetch("/delete/category/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: parseInt(deleteCategoryId) }),
      });
      if (!res.ok) throw new Error();
      setCategories(prev => prev.filter(c => c.id !== deleteCategoryId));
      if (activeCategory === cat?.name) setActiveCategory("Alle");
      const rMap = new Map<number, string>();
      categories.filter(c => c.id !== deleteCategoryId).forEach(c => rMap.set(parseInt(c.id), c.name));
      setProducts(prev => prev.map(p => p.category === cat?.name ? { ...p, category: "Unbekannt" } : p));
    } catch {
      setPageError("Löschen fehlgeschlagen");
    }
    setDeleteCategoryId(null);
  }

  const allCategoryNames = ["Alle", ...categories.map(c => c.name)];
  const productToDelete = products.find(p => p.id === deleteProductId);
  const categoryToDelete = categories.find(c => c.id === deleteCategoryId);

  return (
    <div>
      {/* Desktop sticky header */}
      <div className="hidden md:flex sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4 items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Produkte & Kategorien</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Artikel, Preise und Produktgruppen verwalten</p>
        </div>
        <Button size="sm" onClick={() => activeSection === "produkte"
          ? setProductDialog({ kind: "create" })
          : setCategoryDialog({ kind: "create" })
        }>
          <PlusCircle className="w-4 h-4 mr-2" />
          {activeSection === "produkte" ? "Produkt erstellen" : "Kategorie erstellen"}
        </Button>
      </div>

      {/* Mobile action bar */}
      <div className="md:hidden flex items-center justify-end px-4 py-3 border-b">
        <Button size="sm" onClick={() => activeSection === "produkte"
          ? setProductDialog({ kind: "create" })
          : setCategoryDialog({ kind: "create" })
        }>
          <PlusCircle className="w-4 h-4 mr-2" />
          {activeSection === "produkte" ? "Produkt erstellen" : "Kategorie erstellen"}
        </Button>
      </div>

      {pageError && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm font-semibold text-center">
          {pageError}
        </div>
      )}

      {/* Section toggle */}
      <div className="px-4 pt-4 md:px-6">
        <div className="flex bg-muted rounded-xl p-1 gap-1 max-w-xs">
          <button
            onClick={() => setActiveSection("produkte")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSection === "produkte"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Produkte
            <span className="text-xs font-normal opacity-60">({products.length})</span>
          </button>
          <button
            onClick={() => setActiveSection("kategorien")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSection === "kategorien"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4" />
            Kategorien
            <span className="text-xs font-normal opacity-60">({categories.length})</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="px-4 py-4 md:px-6 pb-8">

          {/* ── Produkte ─────────────────────────────────────────────────── */}
          {activeSection === "produkte" && (
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="flex flex-wrap h-auto gap-1 w-full mb-4">
                {allCategoryNames.map(cat => (
                  <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                ))}
              </TabsList>

              {allCategoryNames.map(catName => {
                const tabProducts = catName === "Alle"
                  ? products
                  : products.filter(p => p.category === catName);
                const isAllTab = catName === "Alle";

                return (
                  <TabsContent key={catName} value={catName}>
                    {tabProducts.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <p className="text-sm opacity-60 mb-4">Keine Produkte{catName !== "Alle" ? " in dieser Kategorie" : ""}</p>
                        <Button variant="outline" onClick={() => setProductDialog({ kind: "create" })}>
                          <PlusCircle className="w-4 h-4 mr-2" /> Produkt erstellen
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              {isAllTab && <th className="w-16 px-3 py-3" />}
                              <th className="text-left font-semibold text-muted-foreground px-4 py-3">Name</th>
                              <th className="text-left font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Kategorie</th>
                              <th className="text-right font-semibold text-muted-foreground px-4 py-3">Preis</th>
                              <th className="w-20 px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {tabProducts.map((p, tabIdx) => {
                              const globalIdx = isAllTab ? tabIdx : products.findIndex(x => x.id === p.id);
                              const cat = categories.find(c => c.name === p.category);
                              return (
                                <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${tabIdx % 2 === 0 ? "" : "bg-muted/10"}`}>
                                  {isAllTab && (
                                    <td className="px-3 py-2">
                                      <div className="flex flex-col gap-0.5 items-center">
                                        <button
                                          onClick={() => moveProduct(globalIdx, -1)}
                                          disabled={globalIdx === 0}
                                          className="p-1 rounded hover:bg-muted disabled:opacity-20 transition-colors"
                                        >
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => moveProduct(globalIdx, 1)}
                                          disabled={globalIdx === products.length - 1}
                                          className="p-1 rounded hover:bg-muted disabled:opacity-20 transition-colors"
                                        >
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-4 py-3 font-medium">{p.name}</td>
                                  <td className="px-4 py-3 hidden sm:table-cell">
                                    <span
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                                      style={{ backgroundColor: cat?.color ?? "#64748b" }}
                                    >
                                      {p.category}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                                    {p.price.toFixed(2)} €
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-1 justify-end">
                                      <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-primary/10 hover:text-primary"
                                        onClick={() => setProductDialog({ kind: "edit", product: p })}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => setDeleteProductId(p.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}

          {/* ── Kategorien ───────────────────────────────────────────────── */}
          {activeSection === "kategorien" && (
            categories.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm opacity-60 mb-4">Noch keine Kategorien angelegt</p>
                <Button variant="outline" onClick={() => setCategoryDialog({ kind: "create" })}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Kategorie erstellen
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="w-12 px-4 py-3" />
                      <th className="text-left font-semibold text-muted-foreground px-4 py-3">Name</th>
                      <th className="text-left font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Produkte</th>
                      <th className="w-20 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, i) => (
                      <tr key={cat.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <td className="px-4 py-3">
                          <div
                            className="w-5 h-5 rounded-full border border-black/10"
                            style={{ backgroundColor: cat.color }}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{cat.name}</td>
                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                          {products.filter(p => p.category === cat.name).length} Produkte
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => setCategoryDialog({ kind: "edit", category: cat })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleteCategoryId(cat.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      <ProductDialog
        mode={productDialog}
        categories={categories}
        onClose={() => setProductDialog(null)}
        onSave={handleProductSave}
      />

      <CategoryDialog
        mode={categoryDialog}
        onClose={() => setCategoryDialog(null)}
        onSave={handleCategorySave}
      />

      {/* Delete product confirmation */}
      <AlertDialog open={!!deleteProductId} onOpenChange={open => { if (!open) setDeleteProductId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produkt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{productToDelete?.name}</strong> wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={confirmDeleteProduct}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete category confirmation */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={open => { if (!open) setDeleteCategoryId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategorie löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{categoryToDelete?.name}</strong> wird dauerhaft gelöscht. Produkte dieser Kategorie bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={confirmDeleteCategory}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
