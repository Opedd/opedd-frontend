import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Loader2, CheckCircle2, XCircle, Users, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { Spinner } from "@/components/ui/Spinner";

interface InviteInfo {
  email: string;
  publisher_name: string;
  expired: boolean;
  accepted: boolean;
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, getAccessToken, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "form" | "submitting" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountExists, setAccountExists] = useState(false);

  // Step 1: Fetch invitation details (public, no auth)
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invitation token provided.");
      return;
    }

    const fetchInvite = async () => {
      try {
        const res = await fetch(
          `${EXT_SUPABASE_URL}/accept-invite?token=${encodeURIComponent(token)}`,
          { headers: { apikey: EXT_ANON_KEY } }
        );
        const result = await res.json();

        if (!result.success || !result.data) {
          setStatus("error");
          setMessage(result.error || "Invalid invitation link.");
          return;
        }

        const info = result.data as InviteInfo;
        setInviteInfo(info);

        if (info.accepted) {
          setStatus("error");
          setMessage("This invitation has already been accepted.");
          return;
        }
        if (info.expired) {
          setStatus("error");
          setMessage("This invitation has expired. Please ask the team owner to send a new one.");
          return;
        }

        // Invite is valid — now decide what to show
        // Wait for auth to settle before deciding
      } catch {
        setStatus("error");
        setMessage("Failed to load invitation details.");
      }
    };

    fetchInvite();
  }, [token]);

  // Step 2: Once we have invite info and auth is settled, decide the flow
  useEffect(() => {
    if (!inviteInfo || inviteInfo.expired || inviteInfo.accepted) return;
    if (authLoading) return;

    if (user) {
      // User is logged in — auto-accept
      acceptAsLoggedInUser();
    } else {
      // Not logged in — show password setup form
      setStatus("form");
    }
  }, [inviteInfo, authLoading, user]);

  const acceptAsLoggedInUser = async () => {
    setStatus("loading");
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setStatus("error");
        setMessage("Not authenticated. Please log in and try again.");
        return;
      }

      const res = await fetch(`${EXT_SUPABASE_URL}/accept-invite`, {
        method: "POST",
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const result = await res.json();

      if (result.success && result.data?.joined) {
        setStatus("success");
        setMessage(
          result.data.already_member
            ? "You're already a member of this team."
            : `You've joined ${result.data.publisher_name || "the team"}!`
        );
        localStorage.removeItem("pending_invite_token");
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to accept invitation.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  const handleSignupAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast({ title: "Weak password", description: "Password must include uppercase, lowercase, and a number.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }

    setStatus("submitting");

    try {
      // Call accept-invite without auth, with password — server creates account + joins team
      const res = await fetch(`${EXT_SUPABASE_URL}/accept-invite`, {
        method: "POST",
        headers: {
          apikey: EXT_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const result = await res.json();

      if (result.success && result.data?.joined) {
        // Account created — now sign them in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: inviteInfo!.email,
          password,
        });

        if (signInError) {
          // Account was created but auto-sign-in failed — tell them to log in manually
          setStatus("success");
          setMessage(`Account created! You've joined ${result.data.publisher_name}. Please log in to continue.`);
          return;
        }

        setStatus("success");
        setMessage(`Welcome! You've joined ${result.data.publisher_name || "the team"}.`);
        localStorage.removeItem("pending_invite_token");
      } else if (res.status === 409) {
        // Account already exists — show login prompt
        setAccountExists(true);
        setStatus("form");
        // Store token for auto-accept after login
        localStorage.setItem("pending_invite_token", token!);
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to create account.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-alice-gray flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link to="/">
            <img src={opeddLogoColor} alt="Opedd" className="h-10" />
          </Link>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-navy-deep/5">
          {/* Loading */}
          {status === "loading" && (
            <div className="text-center py-8 space-y-4">
              <Spinner size="lg" className="text-oxford mx-auto" />
              <p className="text-navy-deep/60 text-sm">Loading invitation...</p>
            </div>
          )}

          {/* Password Setup Form */}
          {(status === "form" || status === "submitting") && inviteInfo && (
            <>
              <div className="mb-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-oxford/10 to-violet-600/10 flex items-center justify-center">
                  <Users size={24} className="text-oxford" />
                </div>
                <h2 className="text-2xl font-bold text-navy-deep">Join {inviteInfo.publisher_name}</h2>
                <p className="text-navy-deep/60 mt-1 text-sm">
                  {accountExists
                    ? "You already have an account. Please log in to accept this invitation."
                    : "Set up your password to join the team."
                  }
                </p>
              </div>

              {accountExists ? (
                <div className="space-y-4">
                  <Button
                    onClick={() => {
                      localStorage.setItem("pending_invite_token", token!);
                      navigate("/login");
                    }}
                    className="w-full h-14 bg-gradient-to-r from-oxford to-violet-600 hover:from-oxford-dark hover:to-violet-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-oxford/25 transition-all active:scale-[0.98]"
                  >
                    Log In to Accept
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSignupAndJoin} className="space-y-5">
                  {/* Email (read-only) */}
                  <div className="space-y-2">
                    <Label className="text-navy-deep/80 font-medium">Email Address</Label>
                    <Input
                      type="email"
                      value={inviteInfo.email}
                      disabled
                      className="bg-slate-100 border-slate-200 h-12 rounded-xl opacity-70 cursor-not-allowed"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label className="text-navy-deep/80 font-medium">Create Password</Label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 chars, uppercase, lowercase, number"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="bg-alice-gray border-navy-deep/10 text-navy-deep placeholder:text-navy-deep/40 h-12 rounded-xl pl-11 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label className="text-navy-deep/80 font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        className="bg-alice-gray border-navy-deep/10 text-navy-deep placeholder:text-navy-deep/40 h-12 rounded-xl pl-11"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full h-14 bg-gradient-to-r from-oxford to-violet-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-oxford/30 disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {status === "submitting" ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner size="md" />
                        Creating account...
                      </span>
                    ) : (
                      "Create Account & Join Team"
                    )}
                  </button>
                </form>
              )}

              {!accountExists && (
                <div className="mt-6 text-center">
                  <p className="text-navy-deep/50 text-sm">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("pending_invite_token", token!);
                        navigate("/login");
                      }}
                      className="text-oxford font-medium hover:underline"
                    >
                      Log In
                    </button>
                  </p>
                </div>
              )}
            </>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-navy-deep">{message}</h2>
              <p className="text-navy-deep/60 text-sm">
                You now have access to the team dashboard. You can view content, transactions, and insights.
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="mt-2 bg-gradient-to-r from-oxford to-violet-600 hover:from-oxford-dark hover:to-violet-700 text-white rounded-xl shadow-lg shadow-oxford/20"
              >
                <Users size={16} className="mr-2" />
                Go to Dashboard
              </Button>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
                <XCircle size={28} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-navy-deep">Invitation Error</h2>
              <p className="text-navy-deep/60 text-sm">{message}</p>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="mt-2 rounded-xl border-slate-200"
              >
                Go Home
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
