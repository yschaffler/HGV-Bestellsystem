"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Numpad } from "./Numpad";
import { UserCircle } from "lucide-react";

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
    <div className="flex-1 flex flex-col justify-between p-4 pb-8 max-w-md mx-auto w-full">
      <div className="flex flex-col items-center mt-8">
        <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary">
          <UserCircle className="w-12 h-12" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-center text-foreground tracking-tight">
          Anmeldung
        </h1>
        <p className="text-muted-foreground mb-8 text-center text-lg">
          Kellner-ID eingeben
        </p>

        <Numpad value={input} onChange={setInput} maxLength={4} />
      </div>

      <div className="mt-8 pt-4">
        <Button
          className="w-full h-20 text-2xl font-bold rounded-2xl active:scale-95 transition-transform"
          onClick={handleSubmit}
          disabled={!input}
        >
          Anmelden
        </Button>
      </div>
    </div>
  );
}