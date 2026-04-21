"use client";

import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { UserCircle, Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Bitte alle Felder ausfüllen.");
      return;
    }
    setError("");
    setLoading(true);

    const res = await fetch("/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Benutzername oder Passwort ist falsch.");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 pb-8 max-w-md mx-auto w-full overflow-y-auto min-h-0">
      <div className="flex flex-col items-center mt-8">
        <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary">
          <UserCircle className="w-12 h-12" />
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center text-foreground tracking-tight">
          Anmeldung
        </h1>
        <p className="text-muted-foreground mb-8 text-center text-lg">
          Bitte melde dich mit deinen Zugangsdaten an
        </p>

        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground">Benutzername</label>
            <Input
              placeholder="Benutzername eingeben"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="p-5"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground">Passwort</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Passwort eingeben"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 p-5"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-8">
        <Button
          className="w-full h-20 text-2xl font-bold rounded-2xl active:scale-95 transition-transform"
          onClick={handleLogin}
          disabled={!username || !password || loading}
        >
          {loading ? "Wird angemeldet..." : "Anmelden"}
        </Button>
      </div>
    </div>
  );
}