import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

type ViewMode = "login" | "forgot-password" | "reset-sent";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("login");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
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
      
      setViewMode("reset-sent");
      toast({
        title: "Email Sent",
        description: "Check your email for the reset link",
      });
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

  const renderLoginForm = () => (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#040042]">Welcome Back</h2>
        <p className="text-[#040042]/60 mt-1">Sign in to your publisher account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#040042]/80 font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#040042]/80 font-medium">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 h-12 rounded-xl"
          />
        </div>
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setViewMode("forgot-password")}
            className="text-sm text-[#4A26ED] hover:underline font-medium"
          >
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#4A26ED]/30 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[#040042]/50 text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-[#4A26ED] font-medium hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </>
  );

  const renderForgotPasswordForm = () => (
    <>
      <button
        type="button"
        onClick={() => setViewMode("login")}
        className="flex items-center gap-2 text-[#040042]/60 hover:text-[#040042] text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Login
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#040042]">Reset Password</h2>
        <p className="text-[#040042]/60 mt-1">Enter your email to receive a reset link</p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-5">
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

  const renderResetSentConfirmation = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mail size={36} className="text-[#4A26ED]" />
      </div>

      <h2 className="text-2xl font-bold text-[#040042] mb-2">Check Your Email</h2>
      <p className="text-[#040042]/60 mb-6">
        We've sent a password reset link to<br />
        <span className="font-medium text-[#040042]">{email}</span>
      </p>

      <div className="bg-[#F2F9FF] rounded-xl p-4 mb-6 border border-[#4A26ED]/10">
        <div className="flex items-start gap-3">
          <CheckCircle size={20} className="text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-[#040042]/70 text-left">
            Click the link in your email to reset your password. The link will expire in 1 hour.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setViewMode("login");
          setEmail("");
        }}
        className="text-[#4A26ED] font-medium hover:underline text-sm"
      >
        Return to Login
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#040042] flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#040042] to-[#0A0066]">
        <Link to="/">
          <img src={opeddLogo} alt="Opedd" className="h-10" />
        </Link>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your Content is Valuable.
            <br />
            <span className="text-[#D1009A]">Make it Sovereign.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-md">
            Access your Publisher Portal to manage assets, track revenue, and control AI licensing.
          </p>
        </div>
        <p className="text-white/40 text-sm">© 2025 Opedd. All rights reserved.</p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F2F9FF]">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link to="/">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#4A26ED] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">o</span>
                </div>
                <span className="text-[#040042] text-2xl font-bold">opedd</span>
              </div>
            </Link>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-[#040042]/5">
            {viewMode === "login" && renderLoginForm()}
            {viewMode === "forgot-password" && renderForgotPasswordForm()}
            {viewMode === "reset-sent" && renderResetSentConfirmation()}
          </div>
        </div>
      </div>
    </div>
  );
}
