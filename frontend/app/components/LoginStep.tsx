"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Numpad } from "./Numpad";

type Props = {
  onNext: (waiterId: string) => void;
};

export function LoginStep({ onNext }: Props) {
  const [input, setInput] = useState("");

  function handleSubmit() {
    if (!input) return;

    onNext(input);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      
      {/* Titel */}
      <h1 className="text-2xl font-semibold mb-6">
        Kellner ID eingeben
      </h1>

      {/* Numpad */}
      <Numpad value={input} onChange={setInput} maxLength={4} />

      {/* Button */}
      <Button
        className="w-full max-w-xs mt-6 h-14 text-xl"
        onClick={handleSubmit}
        disabled={!input}
      >
        Weiter
      </Button>
    </div>
  );
}