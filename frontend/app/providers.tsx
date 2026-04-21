"use client";

import { AuthProvider } from "@/context/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
        <TooltipProvider>{children}</TooltipProvider>
    </AuthProvider>
    );
}