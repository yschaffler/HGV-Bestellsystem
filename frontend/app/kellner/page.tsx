"use client";

import { TableStep } from "@/components/TableStep";
import { TableOverviewStep } from "@/components/TableOverviewStep";
import { Header } from "@/components/Header";
import { useState, useEffect } from "react";

type Step = "table" | "table-overview";

export default function Page() {
  const [step, setStep] = useState<Step>("table");
  const [waiterId, setWaiterId] = useState<string | null>("123");
  const [table, setTable] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // const storedWaiterId = localStorage.getItem("waiterId");
    if (waiterId) {
      //setWaiterId(storedWaiterId);
      setStep("table");
    }
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  return (
    <div className="h-[100dvh] flex flex-col bg-muted/20 overflow-hidden">
      {waiterId && (
        <Header 
          waiterId={waiterId} 
          table={step === "table-overview" ? table : null} 
          onLogout={()=>{}} 
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