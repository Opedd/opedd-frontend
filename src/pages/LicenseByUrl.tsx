import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Spinner } from "@/components/ui/Spinner";

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <img src={opeddLogoColor} alt="Opedd" className="h-8 mb-10" />
      {loading ? (
        <Spinner size="lg" className="text-oxford" />
      ) : error ? (
        <div className="text-center space-y-4 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 text-red-600 px-4 py-1.5 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Not Found
          </div>
          <p className="text-gray-500 text-sm">{error}</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Return Home
          </Button>
        </div>
      ) : null}
      <p className="absolute bottom-6 text-xs text-gray-400">
        Powered by <span className="text-gray-500 font-medium">Opedd Protocol</span>
      </p>
    </div>
  );
}