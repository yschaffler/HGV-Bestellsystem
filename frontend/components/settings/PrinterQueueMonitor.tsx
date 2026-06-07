"use client";
import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, Printer, Wifi, WifiOff, Trash2, RotateCcw, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintJob {
  order_id: number;
  job_type: string;
  table: number;
  waiter_name?: string;
  items: { name: string; quantity: number; price: number; note?: string }[];
  note?: string;
  enqueued_at: string;
}

interface QueueInfo {
  bar: string;
  connected: boolean;
  jobs: PrintJob[];
}

function fmt(v: number) {
  return v.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `vor ${diff}s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`;
  return `vor ${Math.floor(diff / 3600)}h`;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export function PrinterQueueMonitor() {
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [pushState, setPushState] = useState<"idle" | "subscribed" | "unsupported">("idle");

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/printer/queues/");
      if (res.ok) {
        const data: QueueInfo[] = await res.json();
        setQueues(data);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
    const id = setInterval(fetchQueues, 8000);
    return () => clearInterval(id);
  }, [fetchQueues]);

  // Check current push subscription state — also validates that the stored
  // subscription uses the same VAPID key as the server. If not, unsubscribe
  // and prompt the user to re-subscribe (prevents BadJwtToken 403 errors).
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    async function checkSubscription() {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setPushState("idle");
        return;
      }
      // Verify the key matches the server's current VAPID key
      try {
        const keyRes = await fetch("/push/vapid-public-key/");
        const { publicKey } = await keyRes.json();
        const serverKeyBytes = urlBase64ToUint8Array(publicKey);
        const subKeyBytes = sub.options.applicationServerKey;
        // Compare byte-by-byte
        const serverArr = new Uint8Array(serverKeyBytes);
        const subArr = subKeyBytes ? new Uint8Array(subKeyBytes as ArrayBuffer) : null;
        const keysMatch = subArr &&
          serverArr.length === subArr.length &&
          serverArr.every((b, i) => b === subArr[i]);
        if (!keysMatch) {
          // VAPID key changed (e.g. server restarted without persistent DB) — force re-subscribe
          await sub.unsubscribe();
          await fetch("/push/unsubscribe/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          setPushState("idle");
          setActionMsg("Push-Schlüssel hat sich geändert — bitte erneut aktivieren.");
          return;
        }
      } catch {
        // If we can't verify, assume it's fine
      }
      setPushState("subscribed");
    }
    checkSubscription();
  }, []);

  async function subscribePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setActionMsg("Benachrichtigungen wurden abgelehnt.");
        return;
      }
      const keyRes = await fetch("/push/vapid-public-key/");
      const { publicKey } = await keyRes.json();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch("/push/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subJson.endpoint, p256dh: subJson.keys.p256dh, auth: subJson.keys.auth }),
      });
      setPushState("subscribed");
      setActionMsg("Push-Benachrichtigungen aktiviert ✓");
    } catch (e) {
      console.error(e);
      setActionMsg("Fehler beim Aktivieren der Push-Benachrichtigungen.");
    }
  }

  async function unsubscribePush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/push/unsubscribe/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushState("idle");
      setActionMsg("Push-Benachrichtigungen deaktiviert.");
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteJob(bar: string, orderId: number) {
    await fetch("/admin/printer/queues/delete/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bar, order_id: orderId }),
    });
    setActionMsg("Bon aus Warteschlange entfernt.");
    fetchQueues();
  }

  async function resendJob(bar: string, orderId: number) {
    const res = await fetch("/admin/printer/queues/resend/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bar, order_id: orderId }),
    });
    if (res.ok) {
      setActionMsg("Bon erneut gesendet ✓");
    } else {
      setActionMsg("Drucker nicht verbunden — Bon bleibt in Queue.");
    }
    setTimeout(() => setActionMsg(null), 3000);
  }

  const totalPending = queues.reduce((s, q) => s + q.jobs.length, 0);
  const hasAlert = queues.some((q) => !q.connected && q.jobs.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {totalPending === 0 ? "Keine ausstehenden Bons" : `${totalPending} ausstehende${totalPending > 1 ? "" : "r"} Bon${totalPending > 1 ? "s" : ""}`}
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Aktualisiert {lastUpdated.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchQueues}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {actionMsg && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 text-sm text-primary font-medium">
          {actionMsg}
        </div>
      )}

      {hasAlert && (
        <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2.5">
          <WifiOff className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive font-semibold">
            Drucker offline mit ausstehenden Bons — Druckerclient prüfen!
          </p>
        </div>
      )}

      {/* Queue cards */}
      {queues.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground/60 text-center py-6 border border-dashed rounded-xl">
          Keine Druckerwarteschlangen vorhanden
        </p>
      )}

      {queues.map((q) => (
        <div
          key={q.bar}
          className={`border rounded-xl overflow-hidden ${!q.connected && q.jobs.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/10"}`}
        >
          {/* Printer header */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-inherit">
            <Printer className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm text-foreground flex-1">{q.bar}</span>
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${q.connected ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"}`}>
              {q.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {q.connected ? "Verbunden" : "Offline"}
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.jobs.length > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
              {q.jobs.length} {q.jobs.length === 1 ? "Bon" : "Bons"}
            </span>
          </div>

          {/* Jobs list */}
          {q.jobs.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 text-center py-3">
              Warteschlange leer
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {q.jobs.map((job) => {
                const total = job.items.reduce((s, it) => s + it.price * it.quantity, 0);
                return (
                  <div key={job.order_id} className="px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${job.job_type === "STORNO" ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"}`}>
                            {job.job_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Tisch {job.table === 0 ? "Bar" : job.table}
                            {job.waiter_name ? ` · ${job.waiter_name}` : ""}
                          </span>
                          <span className="text-xs text-muted-foreground/60">{timeAgo(job.enqueued_at)}</span>
                        </div>
                        <div className="mt-1 flex flex-col gap-0.5">
                          {job.items.map((it, idx) => (
                            <span key={idx} className="text-xs text-foreground/80">
                              {it.quantity}× {it.name}
                              {it.note ? <span className="text-muted-foreground"> – {it.note}</span> : null}
                            </span>
                          ))}
                          {job.note && (
                            <span className="text-xs text-muted-foreground italic mt-0.5">Notiz: {job.note}</span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-foreground mt-1">{fmt(total)}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => resendJob(q.bar, job.order_id)}
                          disabled={!q.connected}
                          title="Bon erneut senden"
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteJob(q.bar, job.order_id)}
                          title="Bon aus Queue entfernen"
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Push notification toggle */}
      <div className="mt-1 border-t pt-4 flex flex-col gap-2">
        <p className="text-sm font-semibold text-foreground">Admin-Benachrichtigungen</p>
        <p className="text-xs text-muted-foreground">
          Erhalte Push-Nachrichten wenn ein Drucker offline ist und Bons warten (&gt;3 min).
        </p>
        {pushState === "unsupported" && (
          <p className="text-xs text-muted-foreground/60 italic">
            Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
          </p>
        )}
        {pushState !== "unsupported" && (
          <Button
            variant={pushState === "subscribed" ? "outline" : "default"}
            size="sm"
            className="w-full"
            onClick={pushState === "subscribed" ? unsubscribePush : subscribePush}
          >
            {pushState === "subscribed" ? (
              <><BellOff className="w-3.5 h-3.5 mr-1.5" /> Benachrichtigungen deaktivieren</>
            ) : (
              <><Bell className="w-3.5 h-3.5 mr-1.5" /> Benachrichtigungen aktivieren</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
