"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Banknote, CreditCard, ChevronLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

type ApiCategory = { category_id: number; category_name: string };
type ApiProduct = { product_id: number; price: number; name: string; category: number };

type Category = string;

type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  color?: string; // Optional field for button theme
};

const QUICK_PAY_AMOUNTS = [5, 10, 20, 50, 100];

type CartItem = Product & { amount: number };

export default function BarPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("Alle");

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["Alle"]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Backend URLs are relative since they're served by the same Go server
        const catRes = await fetch("/get/all-categories/");
        const prodRes = await fetch("/get/all-products/");
        if (!catRes.ok || !prodRes.ok) throw new Error("Failed to fetch");
        
        const catData: ApiCategory[] = await catRes.json();
        const prodData: ApiProduct[] = await prodRes.json();
        
        const catMap = new Map<number, string>();
        const updatedCats = ["Alle"];
        
        catData.forEach(c => {
          catMap.set(c.category_id, c.category_name);
          updatedCats.push(c.category_name);
        });
        
        setCategories(updatedCats);
        
        const MAPPED_PRODUCTS: Product[] = prodData.map(p => ({
          id: p.product_id.toString(),
          name: p.name,
          category: catMap.get(p.category) || "Unbekannt",
          price: p.price,
        }));
        setProductsList(MAPPED_PRODUCTS);
      } catch (err) {
        console.error("Error loading mock/live data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [givenAmount, setGivenAmount] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.amount), 0);

  // --- Actions --- //

  function addToCart(product: Product) {
    if (navigator.vibrate) navigator.vibrate(10);
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) => p.id === product.id ? { ...p, amount: p.amount + 1 } : p);
      }
      return [...prev, { ...product, amount: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    if (navigator.vibrate) navigator.vibrate(10);
    setCart((prev) => prev.filter((p) => p.id !== productId));
  }

  function updateAmount(productId: string, delta: number) {
    if (navigator.vibrate) navigator.vibrate(10);
    setCart((prev) => prev.map((p) => {
      if (p.id !== productId) return p;
      const newAmount = p.amount + delta;
      if (newAmount <= 0) return p;
      return { ...p, amount: newAmount };
    }));
  }

  function handleCheckout() {
    if (cart.length === 0) return;
    setIsCheckoutOpen(true);
    setGivenAmount(null);
  }

  function confirmPayment() {
    if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
    setIsSuccess(true);
    
    // Simulate transaction saving & close
    setTimeout(() => {
      setIsSuccess(false);
      setIsCheckoutOpen(false);
      setCart([]);
    }, 1500);
  }

  const changeOutput = givenAmount !== null ? givenAmount - totalAmount : 0;

  // --- Render --- //

  const filteredProducts = activeCategory === "Alle" 
    ? productsList 
    : productsList.filter(p => p.category === activeCategory);

  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-muted/10 overflow-hidden font-sans">
      
      {/* ─── LEFT: CART (BON) ─── */}
      <div className="w-full md:w1/3 lg:w-[400px] bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col border-r z-10">
        
        {/* Header Bon */}
        <div className="p-4 border-b flex items-center shrink-0">
          <Button variant="ghost" className="w-10 h-10 p-0 mr-2 rounded-full" onClick={() => router.push("/")}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Bar Kasse</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Aktueller Bon</p>
          </div>
        </div>

        {/* Cart Items list */}
        <div className="flex-1 overflow-y-auto w-full p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <Banknote className="w-16 h-16 mb-4" />
              <p className="font-medium text-lg">Keine Produkte gewählt</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex flex-col bg-muted/30 border p-3 rounded-2xl shadow-sm relative transition-all animate-in slide-in-from-left-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-lg">{item.name}</span>
                  <span className="font-bold text-primary text-lg">{(item.price * item.amount).toFixed(2)}€</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-background border rounded-xl shadow-sm overflow-hidden">
                    <Button
                      variant="ghost"
                      className="w-12 h-12 rounded-none hover:bg-muted active:bg-accent flex items-center justify-center p-0"
                      onClick={() => item.amount > 1 ? updateAmount(item.id, -1) : removeFromCart(item.id)}
                    >
                      {item.amount > 1 ? <Minus className="w-5 h-5" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                    </Button>
                    <span className="w-12 text-center font-bold text-lg">{item.amount}</span>
                    <Button
                      variant="ghost"
                      className="w-12 h-12 rounded-none hover:bg-muted active:bg-accent flex items-center justify-center text-primary p-0"
                      onClick={() => updateAmount(item.id, 1)}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Area */}
        <div className="p-4 bg-background border-t shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-end mb-4 px-2">
            <span className="text-muted-foreground font-semibold text-sm uppercase">Gesamtsumme</span>
            <span className="font-black text-4xl text-primary">{totalAmount.toFixed(2)}€</span>
          </div>
          <Button 
            className="w-full h-20 text-2xl font-bold rounded-2xl shadow-lg active:scale-95 transition-transform" 
            size="lg"
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            BEZAHLEN
          </Button>
        </div>
      </div>

      {/* ─── RIGHT: PRODUCTS GRID ─── */}
      <div className="flex-1 flex flex-col min-h-0 bg-background/50">
        
        {/* Categories Bar */}
        <div className="flex gap-2 p-4 overflow-x-auto border-b bg-background/40 backdrop-blur-sm shrink-0 scrollbar-hide items-center">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className={`rounded-full px-6 py-6 font-bold text-lg shrink-0 transition-all ${
                activeCategory === cat ? "shadow-md" : "border-2 border-border/50 text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
               <p className="font-semibold text-lg">Daten werden geladen...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
              {filteredProducts.map((product) => {
                const inCartAmount = cart.find(c => c.id === product.id)?.amount || 0;
                const hasCustomTheme = !!product.color;
                
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`
                      relative flex flex-col items-center justify-center p-6 h-36 rounded-3xl border-2 transition-all active:scale-[0.97]
                      ${hasCustomTheme ? product.color : "bg-background border-border hover:border-primary/50 text-foreground"}
                      ${inCartAmount > 0 ? "ring-4 ring-primary/40 border-primary" : "shadow-sm hover:shadow-md"}
                    `}
                  >
                    <span className="font-bold text-xl md:text-2xl mb-1 text-center leading-tight">
                      {product.name}
                    </span>
                    <span className="font-semibold opacity-70 text-base">
                      {product.price.toFixed(2)}€
                    </span>
  
                    {inCartAmount > 0 && (
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-sm font-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-0">
                        {inCartAmount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── OVERLAY: KASSIERHILFE (CHECKOUT DIALOG) ─── */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in-0 duration-200">
          <div className="w-full max-w-2xl bg-card border shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Success State */}
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center p-16 h-[500px] text-center animate-in zoom-in-50 duration-300">
                <div className="w-32 h-32 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-20 h-20" />
                </div>
                <h2 className="text-4xl font-black mb-2 tracking-tight">Erfolgreich!</h2>
                <p className="text-xl text-muted-foreground">Bon wird abgeschlossen...</p>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="p-6 md:p-8 border-b bg-muted/20 text-center">
                  <h2 className="text-2xl font-bold text-muted-foreground uppercase tracking-widest mb-2">Zu Zahlen</h2>
                  <div className="text-6xl font-black text-foreground">{totalAmount.toFixed(2)}€</div>
                </div>

                <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8">
                  {/* Geldschein Schnelltasten */}
                  <div className="space-y-3">
                    <p className="font-semibold text-muted-foreground uppercase text-sm tracking-wider">Gegeben (Schnellwahl)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant={givenAmount === totalAmount ? "default" : "outline"}
                        className={`h-16 text-xl font-bold rounded-2xl border-2 ${givenAmount === totalAmount ? "shadow-md" : ""}`}
                        onClick={() => setGivenAmount(totalAmount)}
                      >
                        Passend
                      </Button>
                      
                      {QUICK_PAY_AMOUNTS.filter(amount => amount >= totalAmount).map(amount => (
                        <Button
                          key={amount}
                          variant={givenAmount === amount ? "default" : "outline"}
                          className={`h-16 text-xl font-bold rounded-2xl border-2 ${givenAmount === amount ? "shadow-md bg-green-600 border-green-600 text-white hover:bg-green-700" : ""}`}
                          onClick={() => setGivenAmount(amount)}
                        >
                          {amount} €
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Rückgeld Anzeige */}
                  <div className={`p-6 rounded-3xl border-2 transition-colors duration-300 ${
                    givenAmount !== null 
                      ? (changeOutput >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-destructive/10 border-destructive/30") 
                      : "bg-muted/30 border-transparent"
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold uppercase tracking-wider opacity-70">
                        Rückgeld
                      </span>
                      <span className={`text-5xl font-black ${
                        givenAmount !== null 
                          ? (changeOutput >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive") 
                          : "text-muted-foreground/30"
                      }`}>
                        {givenAmount !== null ? Math.max(0, changeOutput).toFixed(2) : "0.00"}€
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="p-6 md:p-8 bg-muted/10 border-t flex gap-4 shrink-0 mt-auto">
                  <Button 
                    variant="outline" 
                    className="w-1/3 h-20 text-xl font-bold rounded-2xl border-2"
                    onClick={() => setIsCheckoutOpen(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    className="w-2/3 h-20 text-2xl font-black rounded-2xl shadow-xl active:scale-95 transition-transform"
                    onClick={confirmPayment}
                  >
                    <CreditCard className="mr-3 w-7 h-7" />
                    BUCHEN
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
