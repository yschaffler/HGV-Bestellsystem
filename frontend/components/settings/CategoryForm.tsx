import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, X, PlusCircle } from "lucide-react";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerAlpha,
  ColorPickerFormat,
} from "@/components/ui/color-picker";
import Color from "color";
import type { Category } from "@/app/settings/types";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#10b981", "#06b6d4", "#3b82f6",
  "#6366f1", "#d946ef", "#f43f5e", "#64748b"
];

export type CategoryFormProps = {
  initial?: Partial<Category>;
  onSave: (p: Omit<Category, "id">) => void;
  onCancel: () => void;
};

export function CategoryForm({ initial, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color?.toString() ?? PRESET_COLORS[0]);

  const valid = name.trim().length > 0 && color.trim().length > 0;

  function handleSave() {
    if (!valid) return;
    onSave({ name: name.trim(), color: color.trim() });
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-4 mt-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-name">Name</Label>
        <Input
          id="category-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Getränke"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Kategoriefarbe</Label>
        <div className="flex flex-wrap gap-2 mt-1 relative">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 focus:outline-none transition-all ${
                color === c
                  ? "border-primary scale-110 shadow-sm"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`w-8 h-8 rounded-full border-2 flex flex-shrink-0 items-center justify-center cursor-pointer transition-all ${
                  !PRESET_COLORS.includes(color)
                    ? "border-primary scale-110 shadow-sm"
                    : "border-dashed border-muted-foreground/50 hover:bg-muted/50 hover:scale-105 bg-background"
                }`}
                style={!PRESET_COLORS.includes(color) ? { backgroundColor: color } : {}}
                title="Eigene Farbe"
              >
                {!PRESET_COLORS.includes(color) ? null : <PlusCircle className="w-4 h-4 text-muted-foreground" />}
                <span className="sr-only">Eigene Farbe wählen</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 align-start" align="start">
              <ColorPicker
                value={color}
                onChange={(rgbaArray) => {
                  try {
                    setColor(Color.rgb(rgbaArray).hex());
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-56"
              >
                <ColorPickerSelection className="h-40 rounded-lg mb-3" />
                <ColorPickerHue />
                <ColorPickerAlpha />
                <div className="mt-3">
                  <ColorPickerFormat />
                </div>
              </ColorPicker>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Abbrechen
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={!valid}>
          <Check className="w-4 h-4 mr-1" /> Speichern
        </Button>
      </div>
    </div>
  );
}
