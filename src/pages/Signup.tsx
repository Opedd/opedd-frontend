import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, EyeOff, User, Building2 } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import opeddLogoColor from "@/assets/opedd-logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ViewMode = "signup" | "verify-email";

const organizationTypes = [
  "Independent Creator / Newsletter",
  "Media & Publishing House",
  "Academic & Research Institute",
  "Corporate Content Studio",
  "Creative Agency",
  "Other",
];

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const validateForm = (): string | null => {
    if (!firstName.trim()) {
      return "Please enter your first name";
    }

    if (!lastName.trim()) {
      return "Please enter your last name";
    }

    if (!organizationType) {
      return "Please select your organization type";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            organization_type: organizationType,
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

      {/* Google OAuth */}
      <button
        type="button"
        onClick={async () => {
          const { error } = await lovable.auth.signInWithOAuth("google", {
            redirect_uri: window.location.origin + "/auth/callback",
          });
          if (error) {
            toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
          }
        }}
        className="w-full h-12 bg-white border border-[#040042]/15 rounded-xl font-medium text-[#040042] flex items-center justify-center gap-3 hover:bg-[#F2F9FF] transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-[#040042]/10" />
        <span className="text-xs text-[#040042]/40 font-medium">or</span>
        <div className="flex-1 h-px bg-[#040042]/10" />
      </div>

      <form onSubmit={handleSignup} className="space-y-5">
        {/* First Name & Last Name - Side by Side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-[#040042]/80 font-medium">
              First Name
            </Label>
            <div className="relative">
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 h-12 rounded-xl pl-11"
              />
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/30" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-[#040042]/80 font-medium">
              Last Name
            </Label>
            <div className="relative">
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 h-12 rounded-xl pl-11"
              />
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/30" />
            </div>
          </div>
        </div>

        {/* Organization Type Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="organizationType" className="text-[#040042]/80 font-medium">
            Organization Type
          </Label>
          <div className="relative">
            <Select value={organizationType} onValueChange={setOrganizationType} required>
              <SelectTrigger 
                id="organizationType"
                className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] h-12 rounded-xl pl-11 focus:ring-[#4A26ED] focus:ring-2 [&>span]:text-left"
              >
                <SelectValue placeholder="Select your organization type" className="text-[#040042]/40" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-[#E8F2FB] shadow-xl rounded-xl z-50">
                {organizationTypes.map((type) => (
                  <SelectItem 
                    key={type} 
                    value={type}
                    className="text-[#040042] cursor-pointer data-[highlighted]:bg-[#4A26ED] data-[highlighted]:text-white hover:bg-[#F2F9FF] rounded-lg my-0.5 transition-colors"
                  >
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/30 pointer-events-none z-10" />
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
          <p className="text-xs text-[#040042]/50">Min 8 characters, with uppercase, lowercase, and a number</p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#4A26ED]/30 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>

        <p className="text-xs text-[#040042]/50 text-center mt-3">
          By creating an account, you agree to our{" "}
          <Link to="/terms" className="text-[#4A26ED] hover:underline">Terms of Service</Link>
          {" "}and{" "}
          <Link to="/privacy" className="text-[#4A26ED] hover:underline">Privacy Policy</Link>.
        </p>
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
          disabled={isResending}
          onClick={async () => {
            setIsResending(true);
            try {
              const { error } = await supabase.auth.resend({
                type: "signup",
                email,
                options: {
                  emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
              });
              if (error) throw error;
              toast({
                title: "Email Resent",
                description: "A new verification email has been sent",
              });
            } catch (err) {
              toast({
                title: "Failed to Resend",
                description: err instanceof Error ? err.message : "Try again later",
                variant: "destructive",
              });
            } finally {
              setIsResending(false);
            }
          }}
          className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#4A26ED]/30 disabled:opacity-50 transition-all"
        >
          {isResending ? "Sending..." : "Resend Verification Email"}
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode("signup");
            setEmail("");
            setPassword("");
            setFirstName("");
            setLastName("");
            setOrganizationType("");
          }}
          className="w-full h-12 border border-[#040042]/10 text-[#040042] rounded-xl font-medium hover:bg-[#F2F9FF] transition-all"
        >
          Use a Different Email
        </button>

        <p className="text-xs text-[#040042]/40">
          Didn't receive the email? Check your spam folder or click resend above
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
            {viewMode === "signup" && renderSignupForm()}
            {viewMode === "verify-email" && renderVerifyEmail()}
          </div>
        </div>
      </div>
    </div>
  );
}
