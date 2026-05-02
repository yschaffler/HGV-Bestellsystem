"use client";

import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { UserCircle, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "../ui/card";

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

    const res = await fetch("/login/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (res.ok) {
      const redirectUrl = sessionStorage.getItem("redirectAfterLogin") || "/";
      sessionStorage.removeItem("redirectAfterLogin");
      window.location.href = redirectUrl;
    } else {
      setError("Benutzername oder Passwort ist falsch.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl shadow-xl border-0">
        <CardContent className="p-6 flex flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="bg-primary/15 p-5 rounded-full text-primary shadow-sm mb-3">
              <UserCircle className="w-14 h-14" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Anmeldung
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Bitte melde dich mit deinen Zugangsdaten an
            </p>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">
                Benutzername
              </label>
              <Input
                placeholder="Benutzername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-14 text-base"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">
                Passwort
              </label>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 text-base pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
          </div>

          {/* Button */}
          <Button
            className="w-full h-16 text-lg font-semibold rounded-2xl shadow-md active:scale-95 transition-all"
            onClick={handleLogin}
            disabled={!username || !password || loading}
          >
            {loading ? "Wird angemeldet..." : "Anmelden"}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}