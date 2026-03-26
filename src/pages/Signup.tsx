import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, EyeOff, User, Building2, Loader2 } from "lucide-react";
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (viewMode !== "verify-email") return;
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        clearInterval(interval);
        window.location.href = "/dashboard";
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [viewMode]);

  const validateForm = (): string | null => {
    if (!firstName.trim()) return "Please enter your first name";
    if (!lastName.trim()) return "Please enter your last name";
    if (!organizationType) return "Please select your organization type";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    return null;
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast({ title: "Validation Error", description: validationError, variant: "destructive" });
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
      if (data.user && !data.session) {
        setViewMode("verify-email");
        toast({ title: "Account Created", description: "Please check your email to verify your account" });
      } else if (data.session) {
        toast({ title: "Welcome!", description: "Your account has been created successfully" });
        window.location.href = "/dashboard";
      }
    } catch (error) {
      toast({ title: "Signup Failed", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSignupForm = () => (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#111827]">Create Account</h2>
        <p className="text-[#6B7280] mt-1">Join Opedd and protect your content</p>
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
        className="w-full h-11 bg-white border border-[#E5E7EB] rounded-lg font-medium text-[#111827] flex items-center justify-center gap-3 hover:bg-[#F9FAFB] transition-all disabled:opacity-60"
      >
        {isGoogleLoading ? (
          <Loader2 size={18} className="animate-spin text-[#6B7280]" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>
        )}
        {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-[#E5E7EB]" />
        <span className="text-xs text-[#9CA3AF] font-medium">or</span>
        <div className="flex-1 h-px bg-[#E5E7EB]" />
      </div>

      <form onSubmit={handleSignup} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-[#6B7280] font-medium">First Name</Label>
            <div className="relative">
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="pl-10"
              />
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-[#6B7280] font-medium">Last Name</Label>
            <div className="relative">
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="pl-10"
              />
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organizationType" className="text-[#6B7280] font-medium">Organization Type</Label>
          <div className="relative">
            <Select value={organizationType} onValueChange={setOrganizationType} required>
              <SelectTrigger
                id="organizationType"
                className="h-10 pl-10 border-[#E5E7EB] text-[#111827] focus:ring-[#4A26ED]/20 focus:border-[#4A26ED] [&>span]:text-left"
              >
                <SelectValue placeholder="Select your organization type" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-[#E5E7EB] shadow-lg rounded-xl z-50">
                {organizationTypes.map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    className="text-[#111827] cursor-pointer data-[highlighted]:bg-[#EEF0FD] data-[highlighted]:text-[#4A26ED] rounded-lg my-0.5 transition-colors"
                  >
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none z-10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#6B7280] font-medium">Email Address</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10"
            />
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#6B7280] font-medium">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-[#9CA3AF]">Min 8 characters, with uppercase, lowercase, and a number</p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>

        <p className="text-xs text-[#9CA3AF] text-center mt-3">
          By creating an account, you agree to our{" "}
           <a href="/terms" className="text-[#4A26ED] hover:underline">Terms of Service</a>
           {" "}and{" "}
           <a href="/privacy" className="text-[#4A26ED] hover:underline">Privacy Policy</a>.
        </p>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[#6B7280] text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-[#4A26ED] font-medium hover:underline">Sign In</Link>
        </p>
      </div>
    </>
  );

  const renderVerifyEmail = () => (
    <div className="text-center">
      <div className="relative mb-8">
        <div className="w-20 h-20 bg-[#EEF0FD] rounded-full flex items-center justify-center mx-auto">
          <div className="w-14 h-14 bg-[#4A26ED] rounded-full flex items-center justify-center">
            <Mail size={28} className="text-white" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[#111827] mb-2">Verify Your Email</h2>
      <p className="text-[#6B7280] mb-6">
        We've sent a verification link to<br />
        <span className="font-medium text-[#111827]">{email}</span>
      </p>

      <div className="bg-[#F7F8FA] rounded-xl p-5 mb-6 border border-[#E5E7EB]">
        <div className="space-y-3">
          {["Check your inbox for an email from Opedd", "Click the verification link in the email", "You'll be redirected to your dashboard"].map((text, i) => (
            <div key={i} className="flex items-start gap-3 text-left">
              <div className="w-6 h-6 bg-[#EEF0FD] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#4A26ED] text-xs font-bold">{i + 1}</span>
              </div>
              <p className="text-sm text-[#6B7280]">{text}</p>
            </div>
          ))}
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
                options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
              });
              if (error) throw error;
              toast({ title: "Email Resent", description: "A new verification email has been sent" });
            } catch (err) {
              toast({ title: "Failed to Resend", description: err instanceof Error ? err.message : "Try again later", variant: "destructive" });
            } finally {
              setIsResending(false);
            }
          }}
          className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white rounded-lg font-medium disabled:opacity-50 transition-all"
        >
          {isResending ? "Sending..." : "Resend Verification Email"}
        </button>

        <button
          type="button"
          onClick={() => { setViewMode("signup"); setEmail(""); setPassword(""); setFirstName(""); setLastName(""); setOrganizationType(""); }}
          className="w-full h-11 border border-[#E5E7EB] text-[#111827] rounded-lg font-medium hover:bg-[#F9FAFB] transition-all"
        >
          Use a Different Email
        </button>

        <p className="text-xs text-[#9CA3AF]">
          Didn't receive the email? Check your spam folder or click resend above
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between p-12 bg-[#040042]">
        <Link to="/">
          <img src={opeddLogo} alt="Opedd" className="h-10" />
        </Link>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Own Your Content.
            <br />
            Control Your Revenue.
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
      <div className="flex-1 flex items-start justify-center p-4 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-4 sm:py-0">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-6 flex justify-center">
            <Link to="/">
              <img src={opeddLogoColor} alt="Opedd" className="h-10" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E5E7EB]">
            {viewMode === "signup" && renderSignupForm()}
            {viewMode === "verify-email" && renderVerifyEmail()}
          </div>
        </div>
      </div>
    </div>
  );
}