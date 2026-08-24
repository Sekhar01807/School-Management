import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { School, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Password reset token is missing from the URL.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword)
    ) {
      toast.error(
        "Password must contain at least one uppercase letter, lowercase letter, number, and special character."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/users/reset-password", {
        token,
        newPassword,
      });

      setSubmitted(true);
      toast.success("Password reset successfully! You can now sign in.");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-[#F8FAFC] dark:bg-[#0B0F19]">
      <div className="mb-6 flex items-center gap-2.5 font-bold text-xl text-[#0F172A] dark:text-white">
        <div className="bg-[#1E40AF] text-white flex size-9 items-center justify-center rounded-xl shadow-xs">
          <School className="size-5" />
        </div>
        School<span className="text-[#1E40AF]">Sync</span>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#111827] p-8 rounded-2xl border border-[#E2E8F0] dark:border-gray-800 shadow-md">
        {!token ? (
          <div className="text-center space-y-4">
            <div className="size-12 bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="size-6" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">Invalid Reset Link</h2>
            <p className="text-xs text-[#64748B] dark:text-gray-400">
              No reset token was found in the link. Please request a new password reset link.
            </p>
            <Link to="/login">
              <Button className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white mt-4">
                Return to Sign In
              </Button>
            </Link>
          </div>
        ) : submitted ? (
          <div className="text-center space-y-4">
            <div className="size-12 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">Password Updated!</h2>
            <p className="text-xs text-[#64748B] dark:text-gray-400">
              Your password has been successfully reset. Redirecting to the sign-in portal...
            </p>
            <Link to="/login">
              <Button className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white mt-4">
                Sign In Now
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">
                Choose New Password
              </h2>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Enter your new secure password below to regain access to your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Live Password Security Checklist */}
              {newPassword && (
                <div className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-[#E2E8F0] dark:border-gray-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-[#334155] dark:text-gray-300">
                    <span>Password Security</span>
                    <span
                      className={
                        newPassword.length >= 8 &&
                        /[A-Z]/.test(newPassword) &&
                        /[a-z]/.test(newPassword) &&
                        /[0-9]/.test(newPassword) &&
                        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword)
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-[#64748B]"
                      }
                    >
                      {newPassword.length >= 8 &&
                      /[A-Z]/.test(newPassword) &&
                      /[a-z]/.test(newPassword) &&
                      /[0-9]/.test(newPassword) &&
                      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword)
                        ? "Strong & Compliant"
                        : "Security Standards"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div
                      className={`flex items-center gap-1.5 ${
                        newPassword.length >= 8
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      <span>{newPassword.length >= 8 ? "✓" : "○"}</span>
                      <span>8+ characters</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${
                        /[A-Z]/.test(newPassword)
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      <span>{/[A-Z]/.test(newPassword) ? "✓" : "○"}</span>
                      <span>Uppercase (A-Z)</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${
                        /[0-9]/.test(newPassword)
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      <span>{/[0-9]/.test(newPassword) ? "✓" : "○"}</span>
                      <span>Number (0-9)</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${
                        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword)
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      <span>
                        {/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      <span>Special char (!@#$)</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                  Confirm New Password
                </Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white py-5 font-bold text-sm"
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#F1F5F9] dark:border-gray-800 text-center text-xs text-[#64748B]">
              Remember your password?{" "}
              <Link to="/login" className="font-semibold text-[#1E40AF] hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
