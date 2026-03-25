"use client";

import { Button } from "@/components/ui/button";

type NumpadProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

export function Numpad({
  value,
  onChange,
  maxLength = 3,
}: NumpadProps) {
  function handleNumber(num: number) {
    if (value.length >= maxLength) return;

    const newValue = value + num.toString();
    onChange(newValue);

    // vibration (wahrscheinlich nur auf mobilen Geräten)
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function handleDelete() {
    const newValue = value.slice(0, -1);
    onChange(newValue);
  }

  function handleClear() {
    onChange("");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Display */}
      <div className="text-4xl font-bold tracking-widest">
        {value || "-"}
      </div>

      {/* Numpad Grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Button
            key={n}
            onClick={() => handleNumber(n)}
            className="h-16 text-2xl"
          >
            {n}
          </Button>
        ))}

        <Button
          onClick={handleClear}
          variant="destructive"
          className="h-16 text-lg"
        >
          C
        </Button>

        <Button
          onClick={() => handleNumber(0)}
          className="h-16 text-2xl"
        >
          0
        </Button>

        <Button
          onClick={handleDelete}
          className="h-16 text-lg"
        >
          ←
        </Button>
      </div>
    </div>
  );
}