import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

type ViewState = "form" | "sent";

interface ForgotPasswordFlowProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordFlow({ onBackToLogin }: ForgotPasswordFlowProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("form");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setViewState("sent");
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (viewState === "sent") {
    return (
      <div className="text-center py-4">
        {/* Envelope Illustration */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Shadow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-3 bg-[#4A26ED]/10 rounded-full blur-md" />

          {/* Envelope Body */}
          <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
            {/* Envelope back */}
            <rect x="8" y="25" width="104" height="68" rx="8" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.5" />

            {/* Envelope flap (open) */}
            <path d="M8 33 L60 65 L112 33 L112 25 C112 21 108 18 104 18 L16 18 C12 18 8 21 8 25 Z" fill="#F5F3FF" stroke="#C4B5FD" strokeWidth="1.5" />

            {/* Letter peeking out */}
            <rect x="22" y="8" width="76" height="52" rx="4" fill="white" stroke="#DDD6FE" strokeWidth="1" className="animate-pulse" style={{ animationDuration: '3s' }} />

            {/* Letter lines */}
            <line x1="34" y1="22" x2="86" y2="22" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" />
            <line x1="34" y1="32" x2="76" y2="32" stroke="#DDD6FE" strokeWidth="2" strokeLinecap="round" />
            <line x1="34" y1="42" x2="66" y2="42" stroke="#EDE9FE" strokeWidth="2" strokeLinecap="round" />

            {/* Checkmark circle */}
            <circle cx="92" cy="14" r="12" fill="#4A26ED" />
            <path d="M86 14 L90 18 L98 10" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* Envelope front fold */}
            <path d="M8 93 L8 40 L60 72 L112 40 L112 93 C112 96 109 99 105 99 L15 99 C11 99 8 96 8 93 Z" fill="white" stroke="#C4B5FD" strokeWidth="1.5" />
          </svg>

          {/* Sparkle accents */}
          <div className="absolute top-1 right-1 w-2 h-2 bg-[#4A26ED] rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          <div className="absolute top-6 right-[-4px] w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
        </div>

        <h2 className="text-2xl font-bold text-[#040042] mb-2">Check Your Inbox</h2>
        <p className="text-[#040042]/60 mb-2">
          We've sent a password reset link to
        </p>
        <p className="font-semibold text-[#040042] mb-6 text-lg">
          {email}
        </p>

        <div className="bg-gradient-to-r from-[#F5F3FF] to-[#EDE9FE] rounded-xl p-4 mb-8 border border-[#4A26ED]/10 text-left">
          <p className="text-sm text-[#040042]/70 leading-relaxed">
            <span className="font-medium text-[#040042]">Didn't receive it?</span>{" "}
            Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => setViewState("form")}
              className="text-[#4A26ED] font-medium hover:underline inline"
            >
              try again
            </button>{" "}
            with a different email address. The link expires in 1 hour.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onBackToLogin();
            setEmail("");
            setViewState("form");
          }}
          className="inline-flex items-center gap-2 text-[#4A26ED] font-semibold hover:underline transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onBackToLogin}
        className="inline-flex items-center gap-2 text-[#040042]/60 hover:text-[#040042] text-sm mb-6 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Login
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#040042]">Reset Password</h2>
        <p className="text-[#040042]/60 mt-1">Enter your email to receive a reset link</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-email" className="text-[#040042]/80 font-medium">
            Email Address
          </Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 h-12 rounded-xl"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#4A26ED]/30 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </>
  );
}
