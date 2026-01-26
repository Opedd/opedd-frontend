import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Eye, EyeOff, User } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

type ViewMode = "signup" | "verify-email";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("signup");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const validateForm = (): string | null => {
    if (!fullName.trim()) {
      return "Please enter your full name";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }

    return null;
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is required
        setViewMode("verify-email");
        toast({
          title: "Account Created",
          description: "Please check your email to verify your account",
        });
      } else if (data.session) {
        // Auto-confirmed (for development or if disabled)
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully",
        });
        window.location.href = "/dashboard";
      }
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSignupForm = () => (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#040042]">Create Account</h2>
        <p className="text-[#040042]/60 mt-1">Join Opedd and protect your content</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-[#040042]/80 font-medium">
            Full Name
          </Label>
          <div className="relative">
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 h-12 rounded-xl pl-11"
            />
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/30" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#040042]/80 font-medium">
            Email Address
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 h-12 rounded-xl pl-11"
            />
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/30" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#040042]/80 font-medium">
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
              className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 h-12 rounded-xl pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#040042]/40 hover:text-[#040042]/70 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p className="text-xs text-[#040042]/50">Must be at least 8 characters</p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#4A26ED]/30 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[#040042]/50 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-[#4A26ED] font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </>
  );

  const renderVerifyEmail = () => (
    <div className="text-center">
      {/* Glass card with mail illustration */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-[#4A26ED]/10 via-[#7C3AED]/10 to-[#D1009A]/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm border border-[#4A26ED]/20 shadow-lg shadow-[#4A26ED]/10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#4A26ED] to-[#7C3AED] rounded-full flex items-center justify-center">
            <Mail size={32} className="text-white" />
          </div>
        </div>
        {/* Decorative rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 border border-[#4A26ED]/10 rounded-full animate-pulse" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[#040042] mb-2">Verify Your Email</h2>
      <p className="text-[#040042]/60 mb-6">
        We've sent a verification link to<br />
        <span className="font-medium text-[#040042]">{email}</span>
      </p>

      {/* Info card */}
      <div className="bg-gradient-to-br from-[#F2F9FF] to-white rounded-xl p-5 mb-6 border border-[#4A26ED]/10 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-left">
            <div className="w-6 h-6 bg-[#4A26ED]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[#4A26ED] text-xs font-bold">1</span>
            </div>
            <p className="text-sm text-[#040042]/70">Check your inbox for an email from Opedd</p>
          </div>
          <div className="flex items-start gap-3 text-left">
            <div className="w-6 h-6 bg-[#4A26ED]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[#4A26ED] text-xs font-bold">2</span>
            </div>
            <p className="text-sm text-[#040042]/70">Click the verification link in the email</p>
          </div>
          <div className="flex items-start gap-3 text-left">
            <div className="w-6 h-6 bg-[#4A26ED]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[#4A26ED] text-xs font-bold">3</span>
            </div>
            <p className="text-sm text-[#040042]/70">You'll be redirected to your dashboard</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setViewMode("signup");
            setEmail("");
            setPassword("");
            setFullName("");
          }}
          className="w-full h-12 border border-[#040042]/10 text-[#040042] rounded-xl font-medium hover:bg-[#F2F9FF] transition-all"
        >
          Use a Different Email
        </button>
        
        <p className="text-xs text-[#040042]/40">
          Didn't receive the email? Check your spam folder
        </p>
      </div>
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
            Own Your Content.
            <br />
            <span className="text-[#D1009A]">Control Your Revenue.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-md">
            Join publishers who are monetizing AI training and protecting their intellectual property.
          </p>
        </div>
        <p className="text-white/40 text-sm">© 2025 Opedd. All rights reserved.</p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F2F9FF]">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-block bg-[#040042] rounded-xl px-4 py-2">
              <img src={opeddLogo} alt="Opedd" className="h-8" />
            </Link>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-[#040042]/5">
            {viewMode === "signup" && renderSignupForm()}
            {viewMode === "verify-email" && renderVerifyEmail()}
          </div>
        </div>
      </div>
    </div>
  );
}
