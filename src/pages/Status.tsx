import { useState, useEffect, useCallback } from "react";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  latency?: number;
}

interface StatusResponse {
  status: "operational" | "degraded" | "outage";
  services: ServiceStatus[];
}

const statusConfig = {
  operational: { label: "All Systems Operational", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2, dot: "bg-emerald-400" },
  degraded: { label: "Degraded Performance", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: AlertTriangle, dot: "bg-yellow-400" },
  outage: { label: "Major Outage", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle, dot: "bg-red-400" },
};

const serviceStatusConfig = {
  operational: { label: "Operational", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  degraded: { label: "Degraded", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  down: { label: "Down", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function Status() {
  useDocumentTitle("System Status — Opedd");
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/status`, {
        headers: { apikey: EXT_ANON_KEY },
      });
      if (!res.ok) throw new Error("Failed to fetch status");
      const json = await res.json();
      setData(json);
      setLastChecked(new Date());
      setError(null);
    } catch {
      setError("Unable to reach status endpoint");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const overall = data ? statusConfig[data.status] : null;
  const OverallIcon = overall?.icon ?? Activity;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b py-6">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight text-gray-900">Opedd</a>
          <span className="text-xs text-gray-400">System Status</span>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        {/* Overall status */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-gray-600">{error}</p>
          </div>
        ) : data && overall ? (
          <>
            <div className="text-center mb-10">
              <div className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-full border text-lg font-semibold ${overall.color}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${overall.dot} animate-pulse`} />
                <OverallIcon className="w-5 h-5" />
                {overall.label}
              </div>
            </div>

            {/* Service cards */}
            <div className="space-y-3">
              {data.services.map((svc) => {
                const cfg = serviceStatusConfig[svc.status] ?? serviceStatusConfig.operational;
                return (
                  <Card key={svc.name} className="border shadow-none">
                    <CardContent className="flex items-center justify-between py-4 px-5">
                      <span className="font-medium text-gray-900">{svc.name}</span>
                      <div className="flex items-center gap-3">
                        {svc.latency != null && (
                          <span className="text-xs text-gray-400 tabular-nums">{svc.latency} ms</span>
                        )}
                        <Badge variant="outline" className={cfg.className}>
                          {cfg.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Last checked */}
            {lastChecked && (
              <p className="text-center text-xs text-gray-400 mt-8">
                Last checked: {lastChecked.toLocaleTimeString()} · Auto-refreshes every 30s
              </p>
            )}
          </>
        ) : null}
      </main>

      <footer className="border-t py-6 text-center text-xs text-gray-400">
        Powered by Opedd Infrastructure
      </footer>
    </div>
  );
}
