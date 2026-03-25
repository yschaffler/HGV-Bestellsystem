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
  maxLength = 4,
}: NumpadProps) {
  function handleNumber(num: number) {
    if (value.length >= maxLength) return;

    const newValue = value + num.toString();
    onChange(newValue);

    if (navigator.vibrate) navigator.vibrate(20);
  }

  function handleDelete() {
    const newValue = value.slice(0, -1);
    onChange(newValue);
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function handleClear() {
    onChange("");
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[320px] mx-auto">
      {/* Display */}
      <div className="text-5xl font-black tracking-widest h-14 flex items-center justify-center text-primary">
        {value || <span className="text-muted/30">-</span>}
      </div>

      {/* Numpad Grid */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Button
            key={n}
            variant="secondary"
            onClick={() => handleNumber(n)}
            className="h-20 text-3xl font-semibold rounded-2xl active:scale-95 transition-transform bg-secondary/50 hover:bg-secondary/80"
          >
            {n}
          </Button>
        ))}

        <Button
          onClick={handleClear}
          variant="destructive"
          className="h-20 text-xl font-bold rounded-2xl active:scale-95 transition-transform opacity-90"
        >
          C
        </Button>

        <Button
          variant="secondary"
          onClick={() => handleNumber(0)}
          className="h-20 text-3xl font-semibold rounded-2xl active:scale-95 transition-transform bg-secondary/50 hover:bg-secondary/80"
        >
          0
        </Button>

        <Button
          variant="secondary"
          onClick={handleDelete}
          className="h-20 text-2xl rounded-2xl active:scale-95 transition-transform bg-secondary/50 hover:bg-secondary/80"
        >
          ←
        </Button>
      </div>
    </div>
  );
}