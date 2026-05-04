import { useState, useEffect, useMemo } from "react";
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
import {
  signupBuyer,
  getBuyerAccount,
  type IssuedKeyResponse,
  type BuyerType,
  BUYER_TYPES,
  BUYER_TYPE_LABELS,
} from "@/lib/buyerApi";
import { OneTimeKeyModal } from "@/components/buyer/OneTimeKeyModal";
import { COUNTRY_CODES, searchCountries } from "@/lib/countryCodes";

// Phase 5.2.3: buyer signup. Two-stage flow.
//   Stage 1: not authed yet — magic-link delivery via signInWithOtp
//            with emailRedirectTo set to /buyer/signup directly
//            (KI #93, 2026-05-04). User clicks the email link →
//            Supabase verifies the OTP → redirects to
//            /buyer/signup?code=<pkce> → SDK auto-detect
//            (detectSessionInUrl: true in client.ts) exchanges the
//            code transparently when this page mounts. Skipping
//            /auth/callback avoids Supabase's redirect-allowlist
//            query-string strip behavior that broke ?next=/buyer/signup.
//   Stage 2: authed but no enterprise_buyers row — render the 7-field
//            signup form (first/last name, company name + website,
//            buyer type, country, contact email, terms). On submit:
//            POST /buyer-account { action: "signup" } → IssuedKeyResponse.
//            Full key shown ONCE in OneTimeKeyModal; on dismiss,
//            navigate to /buyer/account.
//
// Edge cases handled:
//   - JWT valid + buyer row already exists → redirect to /buyer/account
//   - JWT invalid → user stays on Stage 1 (magic-link form)
//   - Magic-link rate limit (KI #81) → buyer-friendly toast distinct
//                                       from generic send failure
//
// Closes KI #81 part 2 (frontend rate-limit error differentiation).

const TERMS_VERSION = "2026-05-02";  // Phase 5.2.3 bump for new PII fields collected

// Default buyer_type to ai_retrieval — most common AI-lab use case based
// on Phase 5.1 Sentry probe + the 4-type vocab (RAG/inference covers
// the largest segment of inbound integrations).
const DEFAULT_BUYER_TYPE: BuyerType = "ai_retrieval";

type Stage = "magic-link" | "signup-form" | "checking";

function detectRateLimit(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("too many") ||
    m.includes("only request") ||
    m.includes("over_email_send_rate_limit") ||
    m.includes("over_request_rate_limit")
  );
}

export default function BuyerSignup() {
  useDocumentTitle("Sign up — Opedd Buyer");
  const navigate = useNavigate();
  const { user, getAccessToken, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("checking");
  const [email, setEmail] = useState("");
  const [magicLinkSending, setMagicLinkSending] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Phase 5.2.3 signup form state — 6 required fields (+ contact_email
  // pre-filled from auth + terms checkbox).
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [buyerType, setBuyerType] = useState<BuyerType>(DEFAULT_BUYER_TYPE);
  const [countryCode, setCountryCode] = useState<string>("");  // ISO alpha-2
  const [countryQuery, setCountryQuery] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // One-time key display
  const [issued, setIssued] = useState<IssuedKeyResponse | null>(null);

  // KI #97 (2026-05-04): waiting-room gate. When the user lands on this
  // page from a magic-link click, the URL carries ?code=<UUID> (PKCE
  // flow) or #access_token=<token> (legacy implicit-flow defensive guard;
  // unreachable with flowType: 'pkce' but cheap to keep). The Supabase
  // SDK auto-detect (detectSessionInUrl: true in client.ts) processes
  // those params asynchronously and fires onAuthStateChange("SIGNED_IN")
  // when the exchange completes. AuthContext picks up the event and
  // populates `user`; BuyerSignup's stage-gate effect re-runs and
  // transitions to "signup-form".
  //
  // Pre-KI-#97 race: AuthContext.getSession() can resolve with null
  // BEFORE the SDK's auto-detect finishes processing ?code=. AuthContext
  // sets isLoading=false; the stage-gate effect runs with !user; falls
  // through to setStage("magic-link"). When SIGNED_IN fires later,
  // user populates and the effect re-runs — but in some sessions, the
  // stage transition either fails silently or never receives the event,
  // leaving the user stuck on the magic-link form despite being authed.
  //
  // Fix (mirroring AuthCallback.tsx's pattern from KI #80): detect
  // ?code= / #access_token= on mount; while one is present and user is
  // null, hold stage="checking" instead of falling through to
  // "magic-link". Add a 5s timeout fallback for the case where the
  // SDK exchange silently fails (expired code, network drop, race
  // condition we haven't fully characterized).
  //
  // Errors (?error=access_denied&error_code=otp_expired) deliberately
  // NOT caught here — they fall through to the existing magic-link
  // stage immediately. Adding error-specific friendly copy would
  // duplicate AuthCallback's KI #80 part-1 short-circuit; the
  // magic-link form is an acceptable error-recovery surface (user
  // re-enters email, requests new link).
  const [codeInUrl] = useState(() => {
    if (typeof window === "undefined") return false;
    // Use proper URLSearchParams parsing — naive .includes("code=") would
    // false-positive on ?error_code=otp_expired (which contains "code="
    // as a substring inside "error_code=").
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    return (
      params.has("code") ||
      hash.includes("access_token=")
    );
  });

  // Stage gate: when auth resolves, decide whether to show the
  // magic-link form or the signup form (or short-circuit if buyer
  // row already exists).
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      (async () => {
        try {
          const token = await getAccessToken();
          if (!token) { setStage("magic-link"); return; }
          const profile = await getBuyerAccount(token);
          if (profile) {
            navigate("/buyer/account", { replace: true });
            return;
          }
          setContactEmail(user.email ?? "");
          setStage("signup-form");
        } catch (err) {
          console.warn("[BuyerSignup] account check failed:", err);
          setStage("signup-form");
          setContactEmail(user.email ?? "");
        }
      })();
      return;
    }

    // !user
    if (!codeInUrl) {
      setStage("magic-link");
      return;
    }

    // KI #97: codeInUrl AND !user → SDK exchange may be in flight.
    // Hold stage="checking". Add 5s timeout for silent-failure fallback.
    const timeoutId = setTimeout(() => {
      setStage("magic-link");
      toast({
        title: "Sign-in didn't complete",
        description: "Please request a new sign-in link.",
        variant: "destructive",
      });
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [authLoading, user, codeInUrl, getAccessToken, navigate, toast]);

  const filteredCountries = useMemo(
    () => searchCountries(countryQuery).slice(0, 50),
    [countryQuery],
  );

  const selectedCountryName = useMemo(() => {
    const found = COUNTRY_CODES.find((c) => c.code === countryCode);
    return found?.name ?? "";
  }, [countryCode]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setMagicLinkSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/buyer/signup` },
      });
      if (error) throw error;
      setMagicLinkSent(true);
      toast({ title: "Check your inbox", description: `Magic link sent to ${email}. Also check spam.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Try again in a moment.";
      // KI #81 part 2: differentiate rate-limit errors from generic send failure.
      if (detectRateLimit(msg)) {
        toast({
          title: "Please wait a moment",
          description: "You've requested several magic links recently. Try again in a few minutes.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Couldn't send magic link",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setMagicLinkSending(false);
    }
  };

  const validateSignup = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.first_name = "First name is required";
    if (!lastName.trim()) errors.last_name = "Last name is required";
    if (!companyName.trim()) errors.company_name = "Company name is required";
    if (!companyWebsite.trim()) {
      errors.company_website = "Company website is required";
    } else if (!/^https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(companyWebsite.trim())) {
      errors.company_website = "Must start with https:// or http://";
    }
    if (!BUYER_TYPES.includes(buyerType)) errors.buyer_type = "Pick one";
    if (!/^[A-Z]{2}$/.test(countryCode)) errors.country_of_incorporation = "Pick a country";
    if (!contactEmail.trim()) errors.contact_email = "Email is required";
    if (!acceptedTerms) errors.terms = "Accept the terms";
    return errors;
  };

  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!companyName.trim() &&
    !!companyWebsite.trim() &&
    !!countryCode &&
    !!contactEmail.trim() &&
    acceptedTerms &&
    !submitting;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateSignup();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired — sign in again");
      const result = await signupBuyer(token, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company_name: companyName.trim(),
        company_website: companyWebsite.trim(),
        buyer_type: buyerType,
        country_of_incorporation: countryCode,
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
        <div className="bg-white rounded-2xl border border-blue-50 p-8 shadow-sm w-full max-w-lg">
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
              <form onSubmit={handleSignup} className="space-y-5">
                {/* Section 1 — Your details */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="first_name">First name</Label>
                      <Input
                        id="first_name"
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); setFieldErrors({ ...fieldErrors, first_name: "" }); }}
                        autoFocus
                      />
                      {fieldErrors.first_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.first_name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last name</Label>
                      <Input
                        id="last_name"
                        value={lastName}
                        onChange={(e) => { setLastName(e.target.value); setFieldErrors({ ...fieldErrors, last_name: "" }); }}
                      />
                      {fieldErrors.last_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.last_name}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contact_email">Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => { setContactEmail(e.target.value); setFieldErrors({ ...fieldErrors, contact_email: "" }); }}
                      readOnly={!!user}
                      className={user ? "bg-gray-50 cursor-not-allowed" : undefined}
                    />
                    {user && (
                      <p className="text-xs text-gray-400 mt-1">
                        Tied to your <span className="font-mono">{user.email}</span> session.
                      </p>
                    )}
                    {fieldErrors.contact_email && <p className="text-xs text-red-500 mt-1">{fieldErrors.contact_email}</p>}
                  </div>
                </div>

                {/* Section 2 — Your company */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your company</p>
                  <div>
                    <Label htmlFor="company_name">Company name</Label>
                    <Input
                      id="company_name"
                      value={companyName}
                      onChange={(e) => { setCompanyName(e.target.value); setFieldErrors({ ...fieldErrors, company_name: "" }); }}
                      placeholder="Acme AI Lab"
                    />
                    {fieldErrors.company_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.company_name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="company_website">Website</Label>
                    <Input
                      id="company_website"
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => { setCompanyWebsite(e.target.value); setFieldErrors({ ...fieldErrors, company_website: "" }); }}
                      placeholder="https://acme.ai"
                    />
                    {fieldErrors.company_website && <p className="text-xs text-red-500 mt-1">{fieldErrors.company_website}</p>}
                  </div>
                  <div>
                    <Label htmlFor="buyer_type">Use case</Label>
                    <select
                      id="buyer_type"
                      value={buyerType}
                      onChange={(e) => setBuyerType(e.target.value as BuyerType)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-oxford"
                    >
                      {BUYER_TYPES.map((t) => (
                        <option key={t} value={t}>{BUYER_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section 3 — Legal jurisdiction */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Legal jurisdiction</p>
                  <div className="relative">
                    <Label htmlFor="country">Country of incorporation</Label>
                    <Input
                      id="country"
                      value={countryDropdownOpen ? countryQuery : selectedCountryName}
                      onChange={(e) => { setCountryQuery(e.target.value); setCountryDropdownOpen(true); }}
                      onFocus={() => { setCountryQuery(""); setCountryDropdownOpen(true); }}
                      onBlur={() => setTimeout(() => setCountryDropdownOpen(false), 150)}
                      placeholder="Type to search…"
                      autoComplete="off"
                    />
                    {countryDropdownOpen && filteredCountries.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setCountryCode(c.code);
                              setCountryQuery("");
                              setCountryDropdownOpen(false);
                              setFieldErrors({ ...fieldErrors, country_of_incorporation: "" });
                            }}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                          >
                            <span className="font-mono text-gray-400 mr-2">{c.code}</span>{c.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {fieldErrors.country_of_incorporation && <p className="text-xs text-red-500 mt-1">{fieldErrors.country_of_incorporation}</p>}
                  </div>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer">
                  <Checkbox
                    checked={acceptedTerms}
                    onCheckedChange={(v) => { setAcceptedTerms(v === true); setFieldErrors({ ...fieldErrors, terms: "" }); }}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to the{" "}
                    <Link to="/terms" className="text-oxford hover:underline" target="_blank">Terms of Service</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="text-oxford hover:underline" target="_blank">Privacy Policy</Link>
                    {" "}(version {TERMS_VERSION}).
                  </span>
                </label>
                {fieldErrors.terms && <p className="text-xs text-red-500 -mt-3">{fieldErrors.terms}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit}
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
