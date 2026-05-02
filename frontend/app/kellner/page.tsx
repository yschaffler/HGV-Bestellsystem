"use client";

import { TableStep } from "@/components/TableStep";
import { TableOverviewStep } from "@/components/TableOverviewStep";
import { Header } from "@/components/Header";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

type Step = "table" | "table-overview";

export default function Page() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("table");
  const waiterId = user?.username || null;
  const [table, setTable] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (waiterId) {
      setStep("table");
    }
    setIsLoaded(true);
  }, [waiterId]);

  const handleLogout = async () => {
    await fetch("/logout/", { method: "POST" });
    window.location.href = "/";
  };

  if (!isLoaded) return null;

  return (
    <div className="h-[100dvh] flex flex-col bg-muted/20 overflow-hidden">
      {waiterId && (
        <Header
          waiterId={waiterId}
          table={step === "table-overview" ? table : null}
          onLogout={handleLogout}
        />
      )}

      <main className="flex-1 flex flex-col min-h-0">

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