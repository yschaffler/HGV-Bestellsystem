"use client";

import { TableStep } from "@/components/TableStep";
import { TableOverviewStep } from "@/components/TableOverviewStep";
import { Header } from "@/components/Header";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Step = "table" | "table-overview";

export default function Page() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("table");
  const waiterId = user?.username || null;
  const [table, setTable] = useState<number | null>(null);

  const handleLogout = async () => {
    await fetch("/logout/", { method: "POST" });
    window.location.href = "/";
  };

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