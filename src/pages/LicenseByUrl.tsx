import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

export default function LicenseByUrl() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const url = searchParams.get("url");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setError("No URL provided. Use ?url=https://...");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${EXT_SUPABASE_URL}/lookup-article?url=${encodeURIComponent(url)}`,
          { headers: { apikey: EXT_ANON_KEY, Accept: "application/json" } }
        );
        const result = await res.json();
        if (res.ok && result.success && result.data?.id) {
          navigate(`/l/${result.data.id}`, { replace: true });
        } else {
          setError("Article not found in the Opedd registry.");
          setLoading(false);
        }
      } catch {
        setError("Could not look up article. Please try again.");
        setLoading(false);
      }
    })();
  }, [url, navigate]);

  return (
    <div className="min-h-screen bg-[#040042] flex flex-col items-center justify-center px-6">
      <img src={opeddLogo} alt="Opedd" className="h-8 mb-10" />
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      ) : error ? (
        <div className="text-center space-y-4 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-1.5 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Not Found
          </div>
          <p className="text-white/50 text-sm">{error}</p>
          <Button onClick={() => navigate("/")} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Return Home
          </Button>
        </div>
      ) : null}
      <p className="absolute bottom-6 text-xs text-white/20">
        Powered by <span className="text-white/40 font-medium">Opedd Protocol</span>
      </p>
    </div>
  );
}
