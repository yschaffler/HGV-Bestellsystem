"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  PlusCircle, Trash2, Pencil, ChevronUp, ChevronDown,
  Check, X, Activity, Printer,
} from "lucide-react";
import { fetchPrinterSettings, updatePrinterSettings, DEFAULT_SETTINGS } from "@/lib/printerSettings";
import type { PrinterSettings, PrinterRule } from "@/lib/printerSettings";
import type { ApiUser, User } from "@/app/settings/types";
import { PrinterQueueMonitor } from "@/components/settings/PrinterQueueMonitor";

type RuleFormState = {
  barName: string; tableFrom: string; tableTo: string;
  categories: string[]; accountId: string;
};
const emptyForm: RuleFormState = { barName: "", tableFrom: "", tableTo: "", categories: [], accountId: "" };

function ruleToForm(r: PrinterRule): RuleFormState {
  return {
    barName: r.barName,
    tableFrom: r.tableFrom != null ? String(r.tableFrom) : "",
    tableTo: r.tableTo != null ? String(r.tableTo) : "",
    categories: r.categories ?? [],
    accountId: r.accountId ?? "",
  };
}
function formToRule(form: RuleFormState, id: string): PrinterRule {
  const fromRaw = form.tableFrom.trim();
  const toRaw = form.tableTo.trim();
  return {
    id,
    barName: form.barName.trim(),
    tableFrom: fromRaw ? parseInt(fromRaw) : null,
    tableTo: toRaw ? parseInt(toRaw) : null,
    categories: form.categories,
    accountId: form.accountId,
  };
}

function RuleForm({ form, onChange, categories, users, onToggleCat }: {
  form: RuleFormState; onChange: (f: RuleFormState) => void;
  categories: string[]; users: User[]; onToggleCat: (cat: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 mt-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Drucker / Bar-Name *</label>
        <input type="text" value={form.barName} onChange={e => onChange({ ...form, barName: e.target.value })}
          placeholder="z.B. Küche, Bar 1, Bar 2"
          className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Tischbereich <span className="opacity-60">(leer = alle)</span></label>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={1} value={form.tableFrom} onChange={e => onChange({ ...form, tableFrom: e.target.value })}
            placeholder="Von Tisch"
            className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors" />
          <input type="number" min={1} value={form.tableTo} onChange={e => onChange({ ...form, tableTo: e.target.value })}
            placeholder="Bis Tisch"
            className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Account <span className="opacity-60">(leer = alle)</span></label>
        <select value={form.accountId} onChange={e => onChange({ ...form, accountId: e.target.value })}
          className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors">
          <option value="">Alle Accounts</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Kategorien <span className="opacity-60">(keine = alle)</span></label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => {
            const active = form.categories.includes(cat);
            return (
              <button key={cat} type="button" onClick={() => onToggleCat(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${active ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/50"}`}>
                {cat}
              </button>
            );
          })}
          {categories.length === 0 && <p className="text-xs text-muted-foreground/50">Keine Kategorien</p>}
        </div>
      </div>
    </div>
  );
}

export default function DruckerPage() {
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<"regeln" | "queues">("regeln");
  const [newForm, setNewForm] = useState<RuleFormState>(emptyForm);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RuleFormState>(emptyForm);

  useEffect(() => {
    fetchPrinterSettings().then(setPrinterSettings);
    fetch("/get/all-categories/").then(r => r.json()).then((cats: { category_name: string }[]) =>
      setCategories(cats.map(c => c.category_name))
    );
    fetch("/get/all-users/").then(r => r.json()).then((us: ApiUser[]) =>
      setUsers(us.map(u => ({ id: u.user_id.toString(), username: u.user_username, password: "", role: u.user_role })))
    );
  }, []);

  function save(settings: PrinterSettings) { setPrinterSettings(settings); updatePrinterSettings(settings); }
  function addRule() {
    if (!newForm.barName.trim()) return;
    save({ ...printerSettings, rules: [...printerSettings.rules, formToRule(newForm, Date.now().toString())] });
    setNewForm(emptyForm); setShowNewForm(false);
  }
  function startEdit(rule: PrinterRule) { setEditingId(rule.id); setEditForm(ruleToForm(rule)); }
  function saveEdit() {
    if (!editingId || !editForm.barName.trim()) return;
    save({ ...printerSettings, rules: printerSettings.rules.map(r => r.id === editingId ? formToRule(editForm, r.id) : r) });
    setEditingId(null);
  }
  function deleteRule(id: string) {
    save({ ...printerSettings, rules: printerSettings.rules.filter(r => r.id !== id) });
    if (editingId === id) setEditingId(null);
  }
  function moveRule(idx: number, dir: -1 | 1) {
    const rules = [...printerSettings.rules]; const target = idx + dir;
    if (target < 0 || target >= rules.length) return;
    [rules[idx], rules[target]] = [rules[target], rules[idx]];
    save({ ...printerSettings, rules });
  }
  function toggleNewCat(cat: string) {
    setNewForm(f => ({ ...f, categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat] }));
  }
  function toggleEditCat(cat: string) {
    setEditForm(f => ({ ...f, categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat] }));
  }

  const rules = printerSettings.rules;

  return (
    <div>
      {/* Desktop sticky header */}
      <div className="hidden md:flex sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4 items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Drucker</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Regeln, Routen und Warteschlangen verwalten</p>
        </div>
      </div>

      {/* Section toggle */}
      <div className="px-4 pt-4 md:px-6">
        <div className="flex bg-muted rounded-xl p-1 gap-1 max-w-sm">
          <button onClick={() => setActiveSection("regeln")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeSection === "regeln" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Printer className="w-4 h-4" /> Regeln
          </button>
          <button onClick={() => setActiveSection("queues")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeSection === "queues" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Activity className="w-4 h-4" /> Warteschlangen
          </button>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 pb-8">
        {activeSection === "regeln" && (
          <div className="flex flex-col gap-4 max-w-2xl">
            {/* Bar-Orders toggle */}
            <div className="flex items-center justify-between gap-3 bg-card border rounded-2xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Bar-Bestellungen drucken</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bons der Bar-Kasse an zugeordneten Drucker senden</p>
              </div>
              <button
                onClick={() => save({ ...printerSettings, printBarOrders: !printerSettings.printBarOrders })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${printerSettings.printBarOrders ? "bg-primary" : "bg-muted"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${printerSettings.printBarOrders ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Druckregeln</p>
                <p className="text-xs text-muted-foreground">Erste Übereinstimmung gewinnt</p>
              </div>
              {rules.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-6 border border-dashed rounded-xl">
                  Keine Regeln — Artikel werden nicht gedruckt
                </p>
              )}
              <div className="flex flex-col gap-2">
                {rules.map((rule, idx) => {
                  const isEditing = editingId === rule.id;
                  const tableLabel = rule.tableFrom != null || rule.tableTo != null
                    ? `Tisch ${rule.tableFrom ?? "–"} – ${rule.tableTo ?? "–"}` : "Alle Tische";
                  const catLabel = (rule.categories ?? []).length > 0 ? rule.categories.join(", ") : "Alle Kategorien";
                  const accountUser = rule.accountId ? users.find(u => u.id === rule.accountId) : null;
                  return (
                    <div key={rule.id} className={`border rounded-2xl px-3 py-3 bg-card transition-all ${isEditing ? "border-primary/40 bg-primary/5" : ""}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button onClick={() => moveRule(idx, -1)} disabled={idx === 0}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => moveRule(idx, 1)} disabled={idx === rules.length - 1}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                            <span className="font-semibold text-sm">{rule.barName}</span>
                          </div>
                          {!isEditing && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="text-xs bg-muted border rounded-md px-2 py-0.5 text-muted-foreground">{tableLabel}</span>
                              <span className="text-xs bg-muted border rounded-md px-2 py-0.5 text-muted-foreground">{catLabel}</span>
                              {accountUser && (
                                <span className="text-xs bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5 text-primary font-medium">
                                  {accountUser.username}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={saveEdit} className="p-1.5 text-primary hover:text-primary/80 transition-colors"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEdit(rule)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                      {isEditing && (
                        <RuleForm form={editForm} onChange={setEditForm} categories={categories} users={users} onToggleCat={toggleEditCat} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {showNewForm ? (
              <div className="border border-dashed rounded-2xl p-4 bg-muted/5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Neue Regel</p>
                <RuleForm form={newForm} onChange={setNewForm} categories={categories} users={users} onToggleCat={toggleNewCat} />
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowNewForm(false); setNewForm(emptyForm); }}>Abbrechen</Button>
                  <Button size="sm" className="flex-1" onClick={addRule} disabled={!newForm.barName.trim()}>
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Hinzufügen
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full border-dashed" onClick={() => setShowNewForm(true)}>
                <PlusCircle className="w-4 h-4 mr-2" /> Neue Regel
              </Button>
            )}

            <p className="text-xs text-muted-foreground/70 leading-relaxed px-1">
              <span className="font-semibold">Tipp:</span> Zwei Regeln auf denselben Drucker mit unterschiedlichen Kategorien erzeugen zwei separate Bons.
            </p>
          </div>
        )}

        {activeSection === "queues" && <PrinterQueueMonitor />}
      </div>
    </div>
  );
}
