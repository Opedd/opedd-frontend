import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, getAccessToken, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [publisherName, setPublisherName] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store token and redirect to login
      if (token) {
        localStorage.setItem("pending_invite_token", token);
      }
      navigate("/login", { replace: true });
      return;
    }

    // User is logged in — accept the invite
    const acceptInvite = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setStatus("error");
          setMessage("Not authenticated. Please log in and try again.");
          return;
        }

        const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/accept-invite`, {
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
          setPublisherName(result.data.publisher_name || "");
          setMessage(result.data.already_member
            ? "You're already a member of this team."
            : `You've joined ${result.data.publisher_name || "the team"}!`
          );
          // Clear any stored token
          localStorage.removeItem("pending_invite_token");
        } else {
          setStatus("error");
          setMessage(result.error || "Failed to accept invitation.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    acceptInvite();
  }, [user, authLoading, token]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
              <Loader2 size={28} className="text-[#4A26ED] animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-[#040042]">Accepting Invitation...</h1>
            <p className="text-[#040042]/60 text-sm">Please wait while we process your team invitation.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-[#040042]">{message}</h1>
            <p className="text-[#040042]/60 text-sm">
              You now have access to the team dashboard. You can view content, transactions, and insights.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="mt-4 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white rounded-xl shadow-lg shadow-[#4A26ED]/20"
            >
              <Users size={16} className="mr-2" />
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
              <XCircle size={28} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-[#040042]">Invitation Error</h1>
            <p className="text-[#040042]/60 text-sm">{message}</p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="mt-4 rounded-xl border-slate-200"
            >
              Go Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
