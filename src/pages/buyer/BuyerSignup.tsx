import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, KeyRound } from "lucide-react";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { signupBuyer, getBuyerAccount, type IssuedKeyResponse } from "@/lib/buyerApi";
import { OneTimeKeyModal } from "@/components/buyer/OneTimeKeyModal";

// Phase 5.2.2: buyer signup. Two-stage flow.
//   Stage 1: not authed yet — magic-link delivery via signInWithOtp.
//            User clicks the email link → /auth/callback → session set
//            → returns to this page with a JWT.
//   Stage 2: authed but no enterprise_buyers row — render the signup
//            form (name, organization, terms checkbox). On submit:
//            POST /buyer-account { action: "signup" } → IssuedKeyResponse.
//            Full key shown ONCE in OneTimeKeyModal; on dismiss,
//            navigate to /buyer/account.
//
// Edge cases handled:
//   - JWT valid + buyer row already exists → redirect to /buyer/account
//   - JWT invalid → user stays on Stage 1 (magic-link form)

const TERMS_VERSION = "2026-05-01";

type Stage = "magic-link" | "signup-form" | "checking";

export default function BuyerSignup() {
  useDocumentTitle("Sign up — Opedd Buyer");
  const navigate = useNavigate();
  const { user, getAccessToken, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("checking");
  const [email, setEmail] = useState("");
  const [magicLinkSending, setMagicLinkSending] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Signup form state
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // One-time key display
  const [issued, setIssued] = useState<IssuedKeyResponse | null>(null);

  // Stage gate: when auth resolves, decide whether to show the
  // magic-link form or the signup form (or short-circuit if buyer
  // row already exists).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStage("magic-link");
      return;
    }
    // Authed: probe for existing buyer row
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) { setStage("magic-link"); return; }
        const profile = await getBuyerAccount(token);
        if (profile) {
          // Already signed up — redirect
          navigate("/buyer/account", { replace: true });
          return;
        }
        // JWT valid + no buyer row → show signup form
        setContactEmail(user.email ?? "");
        setStage("signup-form");
      } catch (err) {
        console.warn("[BuyerSignup] account check failed:", err);
        setStage("signup-form"); // fail-open to form; backend will reject if JWT bad
        setContactEmail(user.email ?? "");
      }
    })();
  }, [authLoading, user, getAccessToken, navigate]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setMagicLinkSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/buyer/signup")}` },
      });
      if (error) throw error;
      setMagicLinkSent(true);
      toast({ title: "Check your inbox", description: `Magic link sent to ${email}. Also check spam.` });
    } catch (err) {
      toast({
        title: "Couldn't send magic link",
        description: err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setMagicLinkSending(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contactEmail.trim() || !acceptedTerms) return;
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired — sign in again");
      const result = await signupBuyer(token, {
        name: name.trim(),
        organization: organization.trim() || null,
        contact_email: contactEmail.trim(),
        terms_version: TERMS_VERSION,
      });
      setIssued(result);
      toast({ title: "Account created", description: "Save your API key — it won't be shown again." });
    } catch (err) {
      toast({
        title: "Signup failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyModalClose = () => {
    setIssued(null);
    navigate("/buyer/account", { replace: true });
  };

  if (stage === "checking") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center">
        <Spinner size="lg" className="text-oxford" />
      </div>
    );
  }

  return (
    <>
      <SEO title="Sign up — Opedd Buyer" description="Create a buyer account on Opedd to license content programmatically." />
      <div className="min-h-screen bg-alice-gray flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl border border-blue-50 p-8 shadow-sm w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Link to="/"><img src={opeddLogoColor} alt="Opedd" className="h-8" /></Link>
          </div>

          {stage === "magic-link" && !magicLinkSent && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900">Sign up as a buyer</h2>
                <p className="text-gray-500 mt-1 text-sm">License content programmatically.</p>
              </div>
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@yourlab.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={magicLinkSending}>
                  {magicLinkSending ? <Spinner size="md" className="text-white mr-2" /> : <Mail size={16} className="mr-2" />}
                  {magicLinkSending ? "Sending…" : "Send magic link"}
                </Button>
              </form>
              <p className="text-xs text-gray-400 text-center mt-4">
                Already have an account? <Link to="/login" className="text-oxford hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {stage === "magic-link" && magicLinkSent && (
            <div className="text-center py-4">
              <Mail size={36} className="mx-auto text-oxford mb-3" />
              <h2 className="text-xl font-bold text-gray-900">Check your inbox</h2>
              <p className="text-sm text-gray-500 mt-2">
                We sent a link to <strong>{email}</strong>.
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Not in your inbox?{" "}
                <button onClick={() => setMagicLinkSent(false)} className="text-oxford hover:underline">Resend</button>
              </p>
            </div>
          )}

          {stage === "signup-form" && (
            <>
              <div className="mb-6 text-center">
                <KeyRound size={28} className="mx-auto text-oxford mb-2" />
                <h2 className="text-2xl font-bold text-gray-900">Almost there</h2>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="organization">Organization (optional)</Label>
                  <Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Acme AI Lab" />
                </div>
                <div>
                  <Label htmlFor="contact_email">Contact email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    readOnly={!!user}
                    className={user ? "bg-gray-50 cursor-not-allowed" : undefined}
                  />
                  {user && (
                    <p className="text-xs text-gray-400 mt-1">
                      Tied to your <span className="font-mono">{user.email}</span> session.
                    </p>
                  )}
                </div>
                <label className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer">
                  <Checkbox checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} className="mt-0.5" />
                  <span className="text-sm text-gray-700">
                    I agree to the{" "}
                    <Link to="/terms" className="text-oxford hover:underline" target="_blank">Terms of Service</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="text-oxford hover:underline" target="_blank">Privacy Policy</Link>
                    {" "}(version {TERMS_VERSION}).
                  </span>
                </label>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || !acceptedTerms || !name.trim() || !contactEmail.trim()}
                >
                  {submitting ? <Spinner size="md" className="text-white mr-2" /> : <ArrowRight size={16} className="mr-2" />}
                  {submitting ? "Creating account…" : "Create buyer account"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <OneTimeKeyModal
        fullKey={issued?.key ?? null}
        environment={issued?.environment ?? "live"}
        onClose={handleKeyModalClose}
      />
    </>
  );
}
