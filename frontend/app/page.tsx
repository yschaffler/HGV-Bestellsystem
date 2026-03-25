"use client";

import { useState } from "react";
import { LoginStep } from "./components/LoginStep";
import { OrderStep } from "./components/OrderStep";
import { TableStep } from "./components/TableStep";

type Step = "login" | "table" | "order";

export default function Page() {
  const [step, setStep] = useState<Step>("login");
  const [waiterId, setWaiterId] = useState<string | null>(null);
  const [table, setTable] = useState<number | null>(null);

  if (step === "login") {
    return (
      <LoginStep
        onNext={(id) => {
          setWaiterId(id);
          setStep("table");
        }}
      />
    );
  }

  if (step === "table") {
    return (
      <TableStep
        onBack={() => setStep("login")}
        onNext={(t) => {
          setTable(t);
          setStep("order");
        }}
      />
    );
  }

  if (step === "order" && waiterId && table) {
    return (
      <OrderStep
        waiterId={waiterId}
        table={table}
        onBack={() => setStep("table")}
      />
    );
  }

  return null;
}