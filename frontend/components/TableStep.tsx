"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Numpad } from "./Numpad";
import { UtensilsCrossed } from "lucide-react";

type Props = {
  onNext: (table: number) => void;
  onBack?: () => void;
};

export function TableStep({ onNext, onBack }: Props) {
  const [input, setInput] = useState("");

  const table = input ? Number(input) : null;

  function handleSubmit() {
    if (!table) return;
    onNext(table);
  }

  return (
    <div className="flex-1 flex flex-col p-4 pb-8 max-w-md mx-auto w-full overflow-y-auto min-h-0">
      <div className="flex flex-col items-center">
        <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary">
          <UtensilsCrossed className="w-12 h-12" />
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center text-foreground tracking-tight pb-5">
          Tisch wählen
        </h1>

        <Numpad value={input} onChange={setInput} maxLength={3} />
      </div>

      <div className="mt-auto pt-4 flex gap-4">
        {onBack && (
          <Button
            variant="outline"
            className="flex-1 h-20 text-2xl font-bold rounded-2xl active:scale-95 transition-transform"
            onClick={onBack}
          >
            Zurück
          </Button>
        )}

        <Button
          className="flex-[2] h-20 text-2xl font-bold rounded-2xl active:scale-95 transition-transform"
          onClick={handleSubmit}
          disabled={!table}
        >
          Weiter
        </Button>
      </div>
    </div>
  );
}