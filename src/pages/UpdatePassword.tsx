import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Eye, EyeOff, Lock } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import opeddLogoColor from "@/assets/opedd-logo.png";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Invalid or Expired Link",
          description: "Please request a new password reset link",
          variant: "destructive",
        });
        navigate("/login");
      }
    };

    checkSession();
  }, [navigate, toast]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validatePassword(password);
    if (validationError) {
      toast({
        title: "Weak Password",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are identical",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed",
      });

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => (
    <>
      <div className="w-16 h-16 bg-gradient-to-br from-oxford/10 to-violet-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Lock size={28} className="text-oxford" />
      </div>

      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-navy-deep">Set New Password</h2>
        <p className="text-navy-deep/60 mt-1">Enter your new password below</p>
      </div>

      <form onSubmit={handleUpdatePassword} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-navy-deep/80 font-medium">
            New Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-alice-gray border-navy-deep/10 text-navy-deep placeholder:text-navy-deep/40 h-12 rounded-xl pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-deep/40 hover:text-navy-deep/70 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-navy-deep/80 font-medium">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-alice-gray border-navy-deep/10 text-navy-deep placeholder:text-navy-deep/40 h-12 rounded-xl pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-deep/40 hover:text-navy-deep/70 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Password requirements hint */}
        <div className="bg-alice-gray rounded-xl p-4 border border-navy-deep/5">
          <p className="text-xs font-medium text-navy-deep/70 mb-2">Password requirements:</p>
          <ul className="text-xs text-navy-deep/50 space-y-1">
            <li className={password.length >= 8 ? "text-green-600" : ""}>• At least 8 characters</li>
            <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>• One uppercase letter</li>
            <li className={/[a-z]/.test(password) ? "text-green-600" : ""}>• One lowercase letter</li>
            <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>• One number</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-gradient-to-r from-oxford to-violet-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-oxford/30 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </>
  );

  const renderSuccess = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-green-500" />
      </div>

      <h2 className="text-2xl font-bold text-navy-deep mb-2">Password Updated!</h2>
      <p className="text-navy-deep/60 mb-6">
        Your password has been successfully changed. You'll be redirected to your dashboard shortly.
      </p>

      <Link
        to="/dashboard"
        className="inline-flex items-center justify-center w-full h-14 bg-gradient-to-r from-oxford to-violet-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-oxford/30 transition-all active:scale-[0.98]"
      >
        Go to Dashboard
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-deep flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-navy-deep to-navy-deep">
        <Link to="/">
          <img src={opeddLogo} alt="Opedd" className="h-10" />
        </Link>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Secure Your Account.
            <br />
            <span className="text-plum-magenta">Stay Protected.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-md">
            Create a strong password to keep your content and revenue safe.
          </p>
        </div>
        <p className="text-white/40 text-sm">© 2026 Opedd. All rights reserved.</p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-alice-gray">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Link to="/">
              <img src={opeddLogoColor} alt="Opedd" className="h-10" />
            </Link>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-navy-deep/5">
            {isSuccess ? renderSuccess() : renderForm()}
          </div>
        </div>
      </div>
    </div>
  );
}
