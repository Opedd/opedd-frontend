import React, { useState } from "react";
import SEO from "@/components/SEO";
import { useNavigate, Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import opeddLogoColor from "@/assets/opedd-logo.png";
import ForgotPasswordFlow from "@/components/auth/ForgotPasswordFlow";

type ViewMode = "login" | "forgot-password";

export default function Login() {
  useDocumentTitle("Log In — Opedd");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
   const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-gray-500 mt-1">Sign in to your publisher account</p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        disabled={isGoogleLoading}
        onClick={async () => {
          setIsGoogleLoading(true);
          const { error } = await lovable.auth.signInWithOAuth("google", {
            redirect_uri: window.location.origin + "/auth/callback",
          });
          if (error) {
            toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
            setIsGoogleLoading(false);
          }
        }}
        className="w-full h-11 bg-white border border-gray-200 rounded-lg font-medium text-gray-900 flex items-center justify-center gap-3 hover:bg-gray-50 transition-all disabled:opacity-60"
      >
        {isGoogleLoading ? (
          <Loader2 size={18} className="animate-spin text-gray-500" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>
        )}
        {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-500 font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-500 font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setViewMode("forgot-password")}
            className="text-sm text-oxford hover:underline font-medium"
          >
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-oxford hover:bg-oxford-dark text-white rounded-lg font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <p className="text-gray-500 text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-oxford font-medium hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      <SEO title="Log In — Opedd" path="/login" noindex />
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between p-12 bg-navy-deep">
        <Link to="/">
          <img src={opeddLogo} alt="Opedd" className="h-10" />
        </Link>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your content has value.
            <br />
            Now it has a price.
          </h1>
          <ul className="space-y-3 text-white/90 font-medium">
            <li className="flex items-center gap-2">✓ Direct licensing to AI companies</li>
            <li className="flex items-center gap-2">✓ Stripe-quality checkout for buyers</li>
            <li className="flex items-center gap-2">✓ On-chain proof of every license</li>
          </ul>
        </div>
        <p className="text-white/50 text-sm">© 2026 Opedd. All rights reserved.</p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-6 flex justify-center">
            <Link to="/">
              <img src={opeddLogoColor} alt="Opedd" className="h-10" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
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