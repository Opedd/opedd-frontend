import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, CheckCircle, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

export default function MyLicenses() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/resend-licenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await res.json();
      if (res.status === 429) { setError("Too many requests. Please wait an hour and try again."); return; }
      if (!res.ok) throw new Error(result.error || "Something went wrong");
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src={opeddLogoColor} alt="Opedd" className="h-8" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-[#111827]">Check your inbox</h2>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                We've sent all licenses associated with <strong>{email}</strong> to that address. Each license key links to its verification page.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-sm text-[#4A26ED] hover:underline font-medium mt-2"
              >
                Look up a different email
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#4A26ED]/10 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-[#4A26ED]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#111827]">My Licenses</h1>
                  <p className="text-sm text-[#6B7280]">Retrieve all your purchased licenses</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-[#6B7280]">
                    Email Address used at checkout
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    required
                  />
                </div>

                {error && <p className="text-[#EF4444] text-sm">{error}</p>}

                <Button type="submit" disabled={loading || !email} className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</>
                  ) : (
                    <><Mail className="h-4 w-4 mr-2" />Send My Licenses</>
                  )}
                </Button>
              </form>

              <p className="text-xs text-[#9CA3AF] text-center mt-5 leading-relaxed">
                We'll email you a list of all licenses associated with this address. No account required.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <Link to="/verify" className="text-xs text-[#9CA3AF] hover:text-[#6B7280]">Verify a license key</Link>
          <span className="text-[#E5E7EB]">·</span>
          <a href="mailto:support@opedd.com" className="text-xs text-[#9CA3AF] hover:text-[#6B7280]">Help & Support</a>
        </div>
      </div>
    </div>
  );
}
