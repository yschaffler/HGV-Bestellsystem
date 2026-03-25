"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Numpad } from "./Numpad";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      
      <h1 className="text-2xl font-semibold mb-6">
        Tisch auswählen
      </h1>

      <Numpad value={input} onChange={setInput} maxLength={3} />

      <div className="w-full max-w-xs mt-6 flex gap-2">
        {onBack && (
          <Button
            variant="outline"
            className="flex-1 h-14"
            onClick={onBack}
          >
            Zurück
          </Button>
        )}

        <Button
          className="flex-1 h-14 text-xl"
          onClick={handleSubmit}
          disabled={!table}
        >
          Weiter
        </Button>
      </div>
    </div>
  );
}