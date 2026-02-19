import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import opeddLogoColor from "@/assets/opedd-logo.png";
import ForgotPasswordFlow from "@/components/auth/ForgotPasswordFlow";

type ViewMode = "login" | "forgot-password";

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
        <p className="text-white/40 text-sm">© 2026 Opedd. All rights reserved.</p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F2F9FF]">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Link to="/">
              <img src={opeddLogoColor} alt="Opedd" className="h-10" />
            </Link>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-[#040042]/5">
            {viewMode === "login" && renderLoginForm()}
            {viewMode === "forgot-password" && (
              <ForgotPasswordFlow onBackToLogin={() => setViewMode("login")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
