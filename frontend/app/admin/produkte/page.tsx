"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, UtensilsCrossed, Layers, ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { Product, Category, DeleteDialog, ApiProduct, ApiCategory } from "@/app/settings/types";
import { ProductForm } from "@/components/settings/ProductForm";
import { ProductRow } from "@/components/settings/ProductRow";
import { CategoryForm } from "@/components/settings/CategoryForm";
import { CategoryRow } from "@/components/settings/CategoryRow";
import { DeleteConfirmDialog } from "@/components/settings/DeleteConfirmDialog";

export default function ProduktePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, number>>(new Map());
  const [activeSection, setActiveSection] = useState<"produkte" | "kategorien">("produkte");
  const [activeCategory, setActiveCategory] = useState<string>("Alle");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setError("Fehler beim Laden der Daten.");
    } finally {
      setIsLoading(false);
    }
  }

  async function addProduct(p: Omit<Product, "id">) {
    setError(null);
    try {
      const catId = categoryMap.get(p.category) || 0;
      const res = await fetch("/add/product/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: p.price, name: p.name, category: catId }),
      });
      if (!res.ok) throw new Error();
      const rMap = new Map<number, string>();
      categories.forEach(c => rMap.set(parseInt(c.id), c.name));
      await fetchProducts(rMap);
    } catch {
      setError("Fehler beim Speichern des Produkts");
    }
  }

  async function updateProduct(updated: Product) {
    setError(null);
    try {
      const catId = categoryMap.get(updated.category) || 0;
      const res = await fetch("/update/product/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: parseInt(updated.id), price: updated.price, name: updated.name, category: catId }),
      });
      if (!res.ok) throw new Error();
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch {
      setError("Fehler beim Updaten des Produkts");
    }
  }

  async function moveProduct(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= products.length) return;
    const reordered = [...products];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    setProducts(reordered);
    const order = reordered.map(p => parseInt(p.id));
    await fetch("/update/product-order/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  }

  async function addCategory(newCat: Omit<Category, "id">) {
    setError(null);
    const trimmed = newCat.name.trim();
    if (!trimmed || categories.some(c => c.name === trimmed)) return;
    try {
      const res = await fetch("/add/category/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: trimmed, category_color: newCat.color }),
      });
      if (!res.ok) throw new Error();
      await fetchCategories();
    } catch {
      setError("Fehler beim Speichern der Kategorie");
    }
  }

  async function updateCategory(updated: Category) {
    setError(null);
    const trimmed = updated.name.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/update/category/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: parseInt(updated.id), category_name: trimmed, category_color: updated.color }),
      });
      if (!res.ok) throw new Error();
      const { rMap } = await fetchCategories();
      await fetchProducts(rMap);
    } catch {
      setError("Fehler beim Updaten der Kategorie");
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    setError(null);
    try {
      if (deleteDialog.type === "product") {
        const res = await fetch("/delete/product/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: parseInt(deleteDialog.id) }),
        });
        if (!res.ok) throw new Error();
        setProducts(prev => prev.filter(p => p.id !== deleteDialog.id));
      }
      if (deleteDialog.type === "category") {
        const cId = categoryMap.get(deleteDialog.name);
        if (cId !== undefined) {
          const res = await fetch("/delete/category/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: cId }),
          });
          if (!res.ok) throw new Error();
        }
        setCategories(prev => prev.filter(c => c.name !== deleteDialog.name));
        if (activeCategory === deleteDialog.name) setActiveCategory("Alle");
      }
    } catch {
      setError("Löschen fehlgeschlagen");
    }
    setDeleteDialog(null);
  }

  const allCategoryNames = ["Alle", ...categories.map(c => c.name)];

  return (
    <TooltipProvider>
      {/* Sticky page header — desktop only */}
      <div className="hidden md:flex sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4 items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Produkte & Kategorien</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Artikel, Preise und Produktgruppen verwalten</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm font-semibold text-center">
          {error}
        </div>
      )}

      {/* Section toggle */}
      <div className="px-4 pt-4 md:px-6">
        <div className="flex bg-muted rounded-xl p-1 gap-1 max-w-sm">
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="px-4 py-4 md:px-6 pb-8">

          {/* ── Produkte ──────────────────────────────────────────────────── */}
          {activeSection === "produkte" && (
            <div className="flex flex-col gap-3">
              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="flex flex-wrap h-auto gap-1 w-full">
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
                    <TabsContent key={catName} value={catName} className="mt-4">
                      {tabProducts.length > 0 ? (
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {tabProducts.map((p, tabIdx) => {
                            const globalIdx = isAllTab ? tabIdx : products.findIndex(x => x.id === p.id);
                            return (
                              <div key={p.id} className="flex items-start gap-1">
                                {isAllTab && (
                                  <div className="flex flex-col gap-0.5 pt-2 shrink-0">
                                    <button
                                      onClick={() => moveProduct(globalIdx, -1)}
                                      disabled={globalIdx === 0}
                                      className="p-1 rounded hover:bg-muted disabled:opacity-20"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => moveProduct(globalIdx, 1)}
                                      disabled={globalIdx === products.length - 1}
                                      className="p-1 rounded hover:bg-muted disabled:opacity-20"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <ProductRow
                                    product={p}
                                    categories={categories.map(c => c.name)}
                                    onUpdate={updateProduct}
                                    onRequestDelete={(id, name) => setDeleteDialog({ type: "product", id, name })}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="py-10 text-center text-muted-foreground text-sm opacity-50">
                          Keine Produkte in dieser Kategorie
                        </p>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>

              {showAddProduct ? (
                <ProductForm
                  categories={categories.map(c => c.name)}
                  onSave={addProduct}
                  onCancel={() => setShowAddProduct(false)}
                />
              ) : (
                <Button variant="outline" className="w-full border-dashed mt-2" onClick={() => setShowAddProduct(true)}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Produkt hinzufügen
                </Button>
              )}
            </div>
          )}

          {/* ── Kategorien ────────────────────────────────────────────────── */}
          {activeSection === "kategorien" && (
            <div className="flex flex-col gap-3">
              {categories.length === 0 && (
                <p className="py-10 text-center text-muted-foreground text-sm opacity-50">
                  Noch keine Kategorien angelegt
                </p>
              )}
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {categories.map(cat => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    productCount={products.filter(p => p.category === cat.name).length}
                    onUpdate={updateCategory}
                    onRequestDelete={name => setDeleteDialog({ type: "category", name })}
                  />
                ))}
              </div>
              {showAddCategory ? (
                <CategoryForm onSave={addCategory} onCancel={() => setShowAddCategory(false)} />
              ) : (
                <Button variant="outline" className="w-full border-dashed mt-2" onClick={() => setShowAddCategory(true)}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Kategorie hinzufügen
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <DeleteConfirmDialog
        dialog={deleteDialog}
        onOpenChange={open => !open && setDeleteDialog(null)}
        onConfirm={confirmDelete}
      />
    </TooltipProvider>
  );
}
