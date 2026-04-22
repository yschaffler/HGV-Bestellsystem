"use client"
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  PlusCircle,
  UtensilsCrossed,
  Settings2,
  Layers,
  Users,
  ChevronLeft,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { Product, Category, User, ApiProduct, ApiCategory, ApiUser, DeleteDialog } from "@/app/settings/types";
import { ProductForm } from "@/components/settings/ProductForm";
import { ProductRow } from "@/components/settings/ProductRow";
import { CategoryForm } from "@/components/settings/CategoryForm";
import { CategoryRow } from "@/components/settings/CategoryRow";
import { UserForm } from "@/components/settings/UserForm";
import { UserRow } from "@/components/settings/UserRow";
import { DeleteConfirmDialog } from "@/components/settings/DeleteConfirmDialog";
import { useRouter } from "next/navigation";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Settingspage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, number>>(new Map());
  const [activeCategory, setActiveCategory] = useState<string>("Alle");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter()

  React.useEffect(() => {
    async function fetchInitialData() {
      try {
        const catRes = await fetch("/get/all-categories/");
        const prodRes = await fetch("/get/all-products/");
        const userRes = await fetch("/get/all-users/");

        if (!catRes.ok || !prodRes.ok || !userRes.ok) throw new Error("Daten konnten nicht vom Server geladen werden.");

        const catData: ApiCategory[] = await catRes.json();
        const prodData: ApiProduct[] = await prodRes.json();
        const userData: ApiUser[] = await userRes.json();

        const cMap = new Map<string, number>();
        const rMap = new Map<number, string>();
        const cats: Category[] = [];

        catData.forEach(c => {
          cMap.set(c.category_name, c.category_id);
          rMap.set(c.category_id, c.category_name);
          cats.push({ id: c.category_id.toString(), name: c.category_name, color: c.category_color || "#64748b" });
        });

        setUsers(userData.map(u => (
          {
            id: u.user_id.toString(),
            username: u.user_username,
            password: u.user_password,
            role: u.user_role
          })));
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

  const allCategoryNames = ["Alle", ...categories.map(c => c.name)];
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
    if (!trimmed || categories.some(c => c.name === trimmed)) return;
    try {
      const res = await fetch("/add/category/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: trimmed, category_color: newCat.color })
      });
      if (!res.ok) throw new Error("Konnte Kategorie nicht speichern");
      window.location.reload();
    } catch (err) {
      setError("Fehler beim Speichern der Kategorie");
    }
  }

  async function updateCategory(updated: Category) {
    const trimmed = updated.name.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/update/category/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: parseInt(updated.id), category_name: trimmed, category_color: updated.color })
      });
      if (!res.ok) throw new Error("Konnte Kategorie nicht updaten");
      window.location.reload();
    } catch (err) {
      setError("Fehler beim Updaten der Kategorie");
    }
  }

  function requestDeleteCategory(name: string) {
    setDeleteDialog({ type: "category", name });
  }

  // ─── User actions ──────────────────────────────────────────────────────

  async function addUser(u: Omit<User, "id">) {
    try {
      const res = await fetch("/add/user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_username: u.username, user_password: u.password, user_role: u.role })
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch { setError("Fehler beim Speichern des Nutzers"); }
  }

  async function updateUser(updated: User) {
    try {
      const res = await fetch("/update/user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: parseInt(updated.id), user_username: updated.username, user_password: updated.password, user_role: updated.role })
      });
      if (!res.ok) throw new Error();
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch { setError("Fehler beim Updaten des Nutzers"); }
  }

  function requestDeleteUser(id: string, name: string) {
    setDeleteDialog({ type: "user", id, name });
  }

  // ─── Confirm / cancel dialog ───────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteDialog) return;
    setError(null);
    try {
      if (deleteDialog.type === "product") {
        const res = await fetch("/delete/product/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: cId })
          });
          if (!res.ok) throw new Error("Netzwerkfehler");
        }
        setCategories((prev) => prev.filter((c) => c.name !== deleteDialog.name));
        if (activeCategory === deleteDialog.name) setActiveCategory("Alle");
      }
      if (deleteDialog.type === "user") {
        const res = await fetch("/delete/user/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: parseInt(deleteDialog.id) })
        });
        if (!res.ok) throw new Error("Netzwerkfehler");
        setUsers(prev => prev.filter(u => u.id !== deleteDialog.id));
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
          <Button variant="ghost" className="w-10 h-10 p-0 mr-2 rounded-full" onClick={() => router.push("/")}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Einstellungen</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Adminbereich</p>
          </div>
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
                    {allCategoryNames.map((catName) => (
                      <TabsTrigger key={catName} value={catName}>
                        {catName}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {allCategoryNames.map((catName) => {
                    const tabProducts =
                      catName === "Alle"
                        ? products
                        : products.filter((p) => p.category === catName);
                    return (
                      <TabsContent key={catName} value={catName} className="mt-4">
                        {tabProducts.length > 0 ? (
                          tabProducts.map((p) => (
                            <ProductRow
                              key={p.id}
                              product={p}
                              categories={categories.map(c => c.name)}
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
                    categories={categories.map(c => c.name)}
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
                  {categories.map((catObj) => {
                    const productCount = products.filter((p) => p.category === catObj.name).length;
                    return (
                      <CategoryRow
                        key={catObj.id}
                        category={catObj}
                        productCount={productCount}
                        onUpdate={updateCategory}
                        onRequestDelete={requestDeleteCategory}
                      />
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

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Nutzer</CardTitle>
                    <CardDescription>{users.length} Nutzer angelegt</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  {users.map(u => (
                    <UserRow key={u.id} user={u} onUpdate={updateUser} onRequestDelete={requestDeleteUser} />
                  ))}
                </div>
                {showAddUser ? (
                  <UserForm onSave={addUser} onCancel={() => setShowAddUser(false)} />
                ) : (
                  <Button variant="outline" className="w-full border-dashed" onClick={() => setShowAddUser(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Nutzer hinzufügen
                  </Button>
                )}
              </CardContent>
            </Card>

          </div>
        )}


        {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
        <DeleteConfirmDialog dialog={deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)} onConfirm={confirmDelete} />
      </div>
    </TooltipProvider>
  );
}