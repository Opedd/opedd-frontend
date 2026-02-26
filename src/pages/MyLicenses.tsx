import { useState } from "react";
import { EXT_SUPABASE_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MyLicenses() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/resend-licenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success && (data.data?.sent || data.data?.count === 0)) {
        setSent(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#F0EBFF] mb-4">
              <Mail size={24} className="text-[#4A26ED]" />
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "#040042" }}>
              Your Licenses
            </h1>
            <p className="text-sm mt-2" style={{ color: "#6B7280" }}>
              Enter your email to receive a list of all your license keys.
            </p>
          </div>

          {sent ? (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
              <h2 className="text-xl font-semibold" style={{ color: "#040042" }}>
                Check your inbox
              </h2>
              <p className="text-sm mt-2" style={{ color: "#6B7280" }}>
                We've sent all your license keys to <strong>{email}</strong>.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="mt-4 text-sm text-[#6B7280] underline hover:text-[#4A26ED]"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: "#374151" }}>
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="mt-1"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4A26ED] hover:bg-[#3B1FD4] text-white"
              >
                {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                {loading ? "Sending..." : "Send My Licenses"}
              </Button>
              <p className="text-xs text-center" style={{ color: "#9CA3AF" }}>
                We'll only send to addresses that have purchased licenses.
              </p>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
