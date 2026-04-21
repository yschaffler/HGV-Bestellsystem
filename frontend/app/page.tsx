"use client";

import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Beer, Settings, LogIn } from "lucide-react";

type Props = {
  onWaiter: () => void;
  onBar: () => void;
  onSettings: () => void;
  onLogin: () => void;
};

export default function Homepage({
  onWaiter,
  onBar,
  onSettings,
  onLogin,
}: Props) {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-muted/10 p-4">
      
      {/* Wrapper für schönes Zentrieren auf Desktop */}
      <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl">
        
        {/* Titel */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Bestellsystem
          </h1>
          <p className="text-muted-foreground text-sm">
            Wo willst du hin?
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          
          {/* Kellner */}
          <Button
            onClick={onWaiter}
            className="h-32 sm:h-40 md:h-48 rounded-2xl text-lg sm:text-xl font-bold flex flex-col gap-2 active:scale-95 transition-transform shadow-md"
          >
            <UtensilsCrossed className="w-8 h-8 sm:w-10 sm:h-10" />
            Kellner
          </Button>

          {/* Bar/Kasse */}
          <Button
            onClick={onBar}
            className="h-32 sm:h-40 md:h-48 rounded-2xl text-lg sm:text-xl font-bold flex flex-col gap-2 bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition-transform shadow-md"
          >
            <Beer className="w-8 h-8 sm:w-10 sm:h-10" />
            Bar/Kasse
          </Button>

          {/* Settings */}
          <Button
            variant="outline"
            onClick={onSettings}
            className="h-32 sm:h-40 md:h-48 rounded-2xl text-lg sm:text-xl font-bold flex flex-col gap-2 border-2 active:bg-accent active:scale-95 transition-transform"
          >
            <Settings className="w-8 h-8 sm:w-10 sm:h-10" />
            Settings
          </Button>

          {/* Login */}
          <Button
            variant="outline"
            onClick={onLogin}
            className="h-32 sm:h-40 md:h-48 rounded-2xl text-lg sm:text-xl font-bold flex flex-col gap-2 border-2 active:bg-accent active:scale-95 transition-transform"
          >
            <LogIn className="w-8 h-8 sm:w-10 sm:h-10" />
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}