"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChevronLeft,
  Loader2,
  FileDown,
  Trash2,
  Archive,
  CalendarDays,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ArchivedEvent = {
  event_id: number;
  event_name: string;
  event_erstellt_am: string;
  event_gesamt: number;
};

function fmt(n: number) {
  const abs = Math.abs(n).toFixed(2).replace(".", ",");
  return (n < 0 ? "-" : "") + abs + " €";
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<ArchivedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/admin/events/");
      if (res.status === 401 || res.status === 403) {
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error();
      setEvents(await res.json());
    } catch {
      setError("Fehler beim Laden der Events.");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteEvent(id: number) {
    try {
      const res = await fetch(`/admin/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEvents((prev) => prev.filter((e) => e.event_id !== id));
    } catch {
      setError("Event konnte nicht gelöscht werden.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => router.push("/settings")}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Event-Archiv</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Gespeicherte Events
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 font-bold text-center">
          {error}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Archive className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                Noch keine Events gespeichert.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Auf der Statistikseite kannst du den aktuellen Stand als Event archivieren.
              </p>
              <Button variant="outline" size="sm" onClick={() => router.push("/admin/statistiken")}>
                Zur Statistikseite
              </Button>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.event_id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{event.event_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <CalendarDays className="w-3 h-3" />
                      {fmtDate(event.event_erstellt_am)}
                    </CardDescription>
                  </div>
                  <p className="text-xl font-black text-foreground shrink-0">
                    {fmt(event.event_gesamt)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex gap-2">
                <a
                  href={`/admin/events/${event.event_id}/pdf/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="default" size="sm" className="w-full gap-2">
                    <FileDown className="w-4 h-4" /> PDF herunterladen
                  </Button>
                </a>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Event löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        &ldquo;{event.event_name}&rdquo; wird dauerhaft aus dem Archiv entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        onClick={() => deleteEvent(event.event_id)}
                      >
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
