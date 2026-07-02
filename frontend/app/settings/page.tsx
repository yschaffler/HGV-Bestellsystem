"use client"
import React, { useState, useEffect } from "react";
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
  ChevronDown,
  BarChart3,
  ChevronRight,
  Printer,
  Trash2,
  Activity,
} from "lucide-react";
import { fetchPrinterSettings, updatePrinterSettings, DEFAULT_SETTINGS } from "@/lib/printerSettings";
import type { PrinterSettings, PrinterRule } from "@/lib/printerSettings";
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
import { PrinterQueueMonitor } from "@/components/settings/PrinterQueueMonitor";
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
  const [collapsed, setCollapsed] = useState({ produkte: true, kategorien: true, nutzer: true, drucker: true, queues: true });

  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(DEFAULT_SETTINGS);
  const [newRule, setNewRule] = useState<{ barName: string; tableFrom: string; tableTo: string; categories: string[]; accountId: string }>(
    { barName: "", tableFrom: "", tableTo: "", categories: [], accountId: "" }
  );

  useEffect(() => {
    fetchPrinterSettings().then(setPrinterSettings);
  }, []);

  const router = useRouter()

  function toggleCollapsed(key: keyof typeof collapsed) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  function updatePrinter(updated: PrinterSettings) {
    setPrinterSettings(updated);
    updatePrinterSettings(updated);
  }

  function togglePrintBarOrders() {
    updatePrinter({ ...printerSettings, printBarOrders: !printerSettings.printBarOrders });
  }

  function toggleNewRuleCategory(cat: string) {
    setNewRule(r => ({
      ...r,
      categories: r.categories.includes(cat)
        ? r.categories.filter(c => c !== cat)
        : [...r.categories, cat],
    }));
  }

  function addRule() {
    if (!newRule.barName.trim()) return;
    const fromRaw = newRule.tableFrom.trim();
    const toRaw   = newRule.tableTo.trim();
    const tableFrom = fromRaw ? parseInt(fromRaw) : null;
    const tableTo   = toRaw   ? parseInt(toRaw)   : null;
    if (tableFrom !== null && isNaN(tableFrom)) return;
    if (tableTo   !== null && isNaN(tableTo))   return;
    if (tableFrom !== null && tableTo !== null && tableFrom > tableTo) return;
    const rule: PrinterRule = {
      id: Date.now().toString(),
      barName: newRule.barName.trim(),
      tableFrom,
      tableTo,
      categories: newRule.categories,
      accountId: newRule.accountId,
    };
    updatePrinter({ ...printerSettings, rules: [...printerSettings.rules, rule] });
    setNewRule({ barName: "", tableFrom: "", tableTo: "", categories: [], accountId: "" });
  }

  function deleteRule(id: string) {
    updatePrinter({ ...printerSettings, rules: printerSettings.rules.filter(r => r.id !== id) });
  }

  // ── Data fetchers (reusable for targeted refreshes) ───────────────────────

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

  async function fetchUsers() {
    const res = await fetch("/get/all-users/");
    if (!res.ok) throw new Error();
    const userData: ApiUser[] = await res.json();
    setUsers(userData.map(u => ({
      id: u.user_id.toString(),
      username: u.user_username,
      password: u.user_password,
      role: u.user_role,
    })));
  }

  React.useEffect(() => {
    async function fetchInitialData() {
      try {
        const { rMap } = await fetchCategories();
        await Promise.all([fetchProducts(rMap), fetchUsers()]);
      } catch (err) {
        console.error(err);
        setError("Fehler beim Verbinden mit dem Server. Bitte lade die Seite neu.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // re-fetch only products to get the new ID assigned by the backend
      const rMap = new Map<number, string>();
      categories.forEach(c => rMap.set(parseInt(c.id), c.name));
      await fetchProducts(rMap);
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
      // re-fetch categories to pick up the new ID from the backend
      await fetchCategories();
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
      // category name may have changed → re-fetch both so product labels stay in sync
      const { rMap } = await fetchCategories();
      await fetchProducts(rMap);
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
      if (res.status === 409) { setError("Benutzername bereits vergeben"); return; }
      if (!res.ok) throw new Error();
      await fetchUsers();
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
          <div className="bg-destructive text-destructive-foreground px-4 py-2 font-bold text-center z-50 sticky top-14">
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
              <button
                onClick={() => toggleCollapsed("produkte")}
                className="w-full text-left"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Produkte</CardTitle>
                      <CardDescription>{products.length} Artikel angelegt</CardDescription>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${collapsed.produkte ? "" : "rotate-180"}`} />
                  </div>
                </CardHeader>
              </button>
              {!collapsed.produkte && <CardContent className="flex flex-col gap-4 pt-3">

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
              </CardContent>}
            </Card>

            {/* ── Kategorien ───────────────────────────────────────────────────── */}
            <Card>
              <button
                onClick={() => toggleCollapsed("kategorien")}
                className="w-full text-left"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Kategorien</CardTitle>
                      <CardDescription>Produktgruppen verwalten</CardDescription>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${collapsed.kategorien ? "" : "rotate-180"}`} />
                  </div>
                </CardHeader>
              </button>
              {!collapsed.kategorien && <CardContent className="flex flex-col gap-4">

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
              </CardContent>}
            </Card>

            {/* ── Statistiken ──────────────────────────────────────────────── */}
            <button
              onClick={() => router.push("/admin/statistiken")}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-4 hover:bg-secondary/30 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground">Statistiken</p>
                <p className="text-xs text-muted-foreground">Umsatz, Kellner, Kategorien & Event-Reset</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {/* ── Druckerkonfiguration ─────────────────────────────────────── */}
            <Card>
              <button onClick={() => toggleCollapsed("drucker")} className="w-full text-left">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Druckerkonfiguration</CardTitle>
                      <CardDescription>Drucker, Tische & Kategorien</CardDescription>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${collapsed.drucker ? "" : "rotate-180"}`} />
                  </div>
                </CardHeader>
              </button>

              {!collapsed.drucker && (
                <CardContent className="flex flex-col gap-5 pt-3">

                  {/* Toggle: Bar-Bestellungen drucken */}
                  <div className="flex items-center justify-between gap-3 py-1 border-b pb-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Bar-Bestellungen drucken</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Bons der Bar-Kasse an zugeordneten Drucker senden</p>
                    </div>
                    <button
                      onClick={togglePrintBarOrders}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${printerSettings.printBarOrders ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${printerSettings.printBarOrders ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>

                  {/* Existing rules */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground">Druckregeln</p>
                      <p className="text-xs text-muted-foreground">Erste passende Regel gewinnt pro Artikel</p>
                    </div>

                    {printerSettings.rules.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 text-center py-4 border border-dashed rounded-xl">
                        Keine Regeln — Artikel werden nicht gedruckt
                      </p>
                    )}

                    {printerSettings.rules.map((rule, idx) => {
                      const tableLabel = rule.tableFrom != null || rule.tableTo != null
                        ? `Tisch ${rule.tableFrom ?? "–"} bis ${rule.tableTo ?? "–"}`
                        : "Alle Tische";
                      const catLabel = (rule.categories ?? []).length > 0
                        ? rule.categories.join(", ")
                        : "Alle Kategorien";
                      const accountUser = rule.accountId ? users.find(u => u.id === rule.accountId) : null;
                      const accountLabel = accountUser ? accountUser.username : null;
                      return (
                        <div key={rule.id} className="flex items-start gap-2 bg-muted/20 border rounded-xl px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}.</span>
                              <span className="font-semibold text-sm text-foreground">{rule.barName}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-xs bg-background border rounded-md px-2 py-0.5 text-muted-foreground">{tableLabel}</span>
                              <span className="text-xs bg-background border rounded-md px-2 py-0.5 text-muted-foreground">{catLabel}</span>
                              {accountLabel && (
                                <span className="text-xs bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5 text-primary font-medium">
                                  Account: {accountLabel}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add new rule */}
                  <div className="flex flex-col gap-3 border border-dashed rounded-xl p-3 bg-muted/5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Neue Regel</p>

                    {/* Drucker name */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Drucker / Bar-Name *</label>
                      <input
                        type="text"
                        value={newRule.barName}
                        onChange={e => setNewRule(r => ({ ...r, barName: e.target.value }))}
                        placeholder="z.B. Küche, Bar 1, Bar 2"
                        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    {/* Table range */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tischbereich <span className="opacity-60">(leer = alle Tische)</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          value={newRule.tableFrom}
                          onChange={e => setNewRule(r => ({ ...r, tableFrom: e.target.value }))}
                          placeholder="Von Tisch"
                          className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                        <input
                          type="number"
                          min={1}
                          value={newRule.tableTo}
                          onChange={e => setNewRule(r => ({ ...r, tableTo: e.target.value }))}
                          placeholder="Bis Tisch"
                          className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    {/* Account filter */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Account <span className="opacity-60">(leer = alle Accounts)</span></label>
                      <select
                        value={newRule.accountId}
                        onChange={e => setNewRule(r => ({ ...r, accountId: e.target.value }))}
                        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="">Alle Accounts</option>
                        {users.filter(u => u.role === "BAR" || u.role === "KELLNER").map(u => (
                          <option key={u.id} value={u.id}>{u.username}</option>
                        ))}
                      </select>
                    </div>

                    {/* Category filter */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Kategorien <span className="opacity-60">(keine = alle Kategorien)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(cat => {
                          const active = newRule.categories.includes(cat.name);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleNewRuleCategory(cat.name)}
                              style={active ? { backgroundColor: cat.color, borderColor: cat.color, color: "#fff" } : { borderColor: cat.color + "60" }}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${active ? "" : "text-muted-foreground hover:border-current"}`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                        {categories.length === 0 && (
                          <p className="text-xs text-muted-foreground/50">Keine Kategorien geladen</p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={addRule}
                      disabled={!newRule.barName.trim()}
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                      Regel hinzufügen
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground/70 leading-relaxed">
                    <span className="font-semibold">Tipp:</span> Regeln werden von oben nach unten geprüft — erste Übereinstimmung gewinnt pro Artikel. Artikel ohne passende Regel werden nicht gedruckt. Kombination aus Tisch <em>und</em> Kategorie ist möglich.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* ── Druckerwarteschlangen ────────────────────────────────────── */}
            <Card>
              <button onClick={() => toggleCollapsed("queues")} className="w-full text-left">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Druckerwarteschlangen</CardTitle>
                      <CardDescription>Bon-Queue überwachen, neu drucken & löschen</CardDescription>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${collapsed.queues ? "" : "rotate-180"}`} />
                  </div>
                </CardHeader>
              </button>
              {!collapsed.queues && (
                <CardContent className="pt-0">
                  <PrinterQueueMonitor />
                </CardContent>
              )}
            </Card>

            {/* ── Users ───────────────────────────────────────────────────── */}
            <Card>
              <button
                onClick={() => toggleCollapsed("nutzer")}
                className="w-full text-left"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Nutzer</CardTitle>
                      <CardDescription>{users.length} Nutzer angelegt</CardDescription>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${collapsed.nutzer ? "" : "rotate-180"}`} />
                  </div>
                </CardHeader>
              </button>
              {!collapsed.nutzer && <CardContent className="flex flex-col gap-4 pt-3">
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
              </CardContent>}
            </Card>

          </div>
        )}


        {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
        <DeleteConfirmDialog dialog={deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)} onConfirm={confirmDelete} />
      </div>
    </TooltipProvider>
  );
}