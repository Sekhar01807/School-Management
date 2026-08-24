import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  User,
  Shield,
  KeyRound,
  Phone,
  MapPin,
  HeartHandshake,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  School,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
];

export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Profile Form State
  const [name, setName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [address, setAddress] = useState(user?.address || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [emergencyName, setEmergencyName] = useState(user?.emergencyContact?.name || "");
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContact?.phone || "");
  const [emergencyRelation, setEmergencyRelation] = useState(user?.emergencyContact?.relationship || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhoneNumber(user.phoneNumber || "");
      setAddress(user.address || "");
      setAvatar(user.avatar || "");
      setEmergencyName(user.emergencyContact?.name || "");
      setEmergencyPhone(user.emergencyContact?.phone || "");
      setEmergencyRelation(user.emergencyContact?.relationship || "");
    }
  }, [user]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      setSavingProfile(true);
      const res = await api.put("/users/profile", {
        name,
        phoneNumber,
        address,
        avatar,
        emergencyContact: {
          name: emergencyName,
          phone: emergencyPhone,
          relationship: emergencyRelation,
        },
      });

      if (res.data?.user) {
        setUser((prev: any) => ({ ...prev, ...res.data.user }));
      }
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword)
    ) {
      toast.error(
        "New password must contain at least one uppercase letter, lowercase letter, number, and special character."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setUpdatingPassword(true);
      await api.put("/users/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const roleColor =
    user?.role === "admin"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
      : user?.role === "teacher"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
      : user?.role === "student"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-gray-800">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-[#1E40AF]/20 shadow-xs">
            <AvatarImage src={avatar || user?.avatar} alt={user?.name} />
            <AvatarFallback className="bg-[#1E40AF] text-white font-bold text-xl">
              {user?.name?.slice(0, 2).toUpperCase() || "US"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                {user?.name}
              </h1>
              <Badge className={`capitalize font-semibold text-xs px-2.5 py-0.5 rounded-full ${roleColor}`}>
                {user?.role}
              </Badge>
            </div>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">{user?.email}</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#F1F5F9] dark:bg-gray-800/60 p-1 rounded-xl border border-[#E2E8F0] dark:border-gray-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "profile"
                ? "bg-white dark:bg-gray-900 text-[#1E40AF] dark:text-blue-400 shadow-xs"
                : "text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <User className="size-4" /> Personal Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "security"
                ? "bg-white dark:bg-gray-900 text-[#1E40AF] dark:text-blue-400 shadow-xs"
                : "text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <Shield className="size-4" /> Security & Password
          </button>
        </div>
      </div>

      {/* TAB 1: PERSONAL PROFILE */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card className="border-[#E2E8F0] dark:border-gray-800 shadow-xs bg-white dark:bg-[#111827]">
            <CardHeader className="pb-4 border-b border-[#F1F5F9] dark:border-gray-800/80">
              <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <User className="size-4 text-[#1E40AF]" /> General Information
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
                Update your account details and contact preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Preset Avatar Selection */}
              <div>
                <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300 mb-2 block">
                  Profile Avatar
                </Label>
                <div className="flex flex-wrap items-center gap-3">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`relative rounded-full p-0.5 transition-all ${
                        avatar === url
                          ? "ring-2 ring-[#1E40AF] scale-105"
                          : "opacity-70 hover:opacity-100 ring-1 ring-transparent"
                      }`}
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={url} alt={`Avatar option ${i + 1}`} />
                      </Avatar>
                      {avatar === url && (
                        <span className="absolute bottom-0 right-0 bg-[#1E40AF] text-white rounded-full p-0.5 shadow-xs">
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Input
                    placeholder="Or enter custom avatar image URL..."
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                    Full Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                    Email Address <span className="text-[#94A3B8] font-normal">(Institution Verified)</span>
                  </Label>
                  <Input value={user?.email || ""} disabled className="bg-slate-50 dark:bg-gray-800/50 text-[#64748B]" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300 flex items-center gap-1.5">
                    <Phone className="size-3.5 text-[#64748B]" /> Phone Number
                  </Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300 flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-[#64748B]" /> Physical Address
                  </Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Campus Lane, Suite 400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact Card (Important for Students & Parents) */}
          {(user?.role === "student" || user?.role === "parent") && (
            <Card className="border-[#E2E8F0] dark:border-gray-800 shadow-xs bg-white dark:bg-[#111827]">
              <CardHeader className="pb-4 border-b border-[#F1F5F9] dark:border-gray-800/80">
                <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <HeartHandshake className="size-4 text-[#DC2626]" /> Emergency Contact
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
                  Primary guardian or medical contact to notify in emergencies.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                    Contact Name
                  </Label>
                  <Input
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Robert Johnson"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                    Contact Phone
                  </Label>
                  <Input
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+1 (555) 987-6543"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                    Relationship
                  </Label>
                  <Input
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    placeholder="e.g. Father, Mother, Guardian"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={savingProfile}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-6 font-semibold"
            >
              {savingProfile ? "Saving Changes..." : "Save Profile Details"}
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === "security" && (
        <form onSubmit={handleChangePassword} className="space-y-6">
          <Card className="border-[#E2E8F0] dark:border-gray-800 shadow-xs bg-white dark:bg-[#111827]">
            <CardHeader className="pb-4 border-b border-[#F1F5F9] dark:border-gray-800/80">
              <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <KeyRound className="size-4 text-[#1E40AF]" /> Change Account Password
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
                Ensure your account is using a strong password with at least 6 characters.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 max-w-md">
              {/* Current Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                  >
                    {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                  >
                    {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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

              {/* Confirm Password */}
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
                />
              </div>

              {/* Password Strength Tip */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-xs text-[#1E40AF] dark:text-blue-300 flex items-start gap-2.5">
                <Sparkles className="size-4 mt-0.5 shrink-0" />
                <span>
                  Use a mix of letters, numbers, and symbols for enhanced security against brute-force attacks.
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updatingPassword}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-6 font-semibold"
            >
              {updatingPassword ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
