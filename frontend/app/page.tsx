"use client";

import { LoginStep } from "@/components/LoginStep";
import { TableStep } from "@/components/TableStep";
import { TableOverviewStep } from "@/components/TableOverviewStep";
import { Header } from "@/components/Header";
import { useState, useEffect } from "react";

type Step = "login" | "table" | "table-overview";

export default function Page() {
  const [step, setStep] = useState<Step>("login");
  const [waiterId, setWaiterId] = useState<string | null>(null);
  const [table, setTable] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedWaiterId = localStorage.getItem("waiterId");
    if (storedWaiterId) {
      setWaiterId(storedWaiterId);
      setStep("table");
    }
    setIsLoaded(true);
  }, []);

  function handleLogin(id: string) {
    localStorage.setItem("waiterId", id);
    setWaiterId(id);
    setStep("table");
  }

  function handleLogout() {
    localStorage.removeItem("waiterId");
    setWaiterId(null);
    setTable(null);
    setStep("login");
  }

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {waiterId && (
        <Header 
          waiterId={waiterId} 
          table={step === "table-overview" ? table : null} 
          onLogout={handleLogout} 
        />
      )}
      
      <main className="flex-1 flex flex-col">
        {step === "login" && (
          <LoginStep onNext={handleLogin} />
        )}

        {step === "table" && waiterId && (
          <TableStep
            onNext={(t) => {
              setTable(t);
              setStep("table-overview");
            }}
          />
        )}

        {step === "table-overview" && waiterId && table && (
          <TableOverviewStep
            waiterId={waiterId}
            table={table}
            onCheckout={() => alert("Abrechnen noch nicht implementiert")}
            onReturn={() => alert("Warenretoure noch nicht implementiert")}
            onBack={() => {
              setTable(null);
              setStep("table");
            }}
          />
        )}
      </main>
    </div>
  );
}