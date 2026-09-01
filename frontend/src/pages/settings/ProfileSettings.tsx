import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { useTheme } from "@/components/provider/theme";
import { useNavigate } from "react-router";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  User,
  Palette,
  Shield,
  Upload,
  CheckCircle2,
  Lock,
  Sun,
  Moon,
  Laptop,
  Camera,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [name, setName] = useState(user?.name || "");
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [jobTitle, setJobTitle] = useState(
    user?.role === "admin"
      ? "Principal Administrator"
      : user?.role === "teacher"
      ? "Faculty Member"
      : user?.role === "student"
      ? "Enrolled Student"
      : "Guardian / Parent"
  );
  const [organization, setOrganization] = useState("SchoolSync Academy");
  const [country, setCountry] = useState("India");
  const [timeZone, setTimeZone] = useState("(GMT+05:30) India Standard Time (IST)");
  const [address, setAddress] = useState(user?.address || "Hyderabad, Telangana");
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContact?.phone || "+91 98481 23456");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Photo Edit Modal State
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [customPhotoInput, setCustomPhotoInput] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setDisplayName(user.name || "");
      setPhoneNumber(user.phoneNumber || "");
      setAddress(user.address || "Hyderabad, Telangana");
      setAvatarUrl(user.avatar || "");
      setEmergencyPhone(user.emergencyContact?.phone || "+91 98481 23456");
      setJobTitle(
        user.role === "admin"
          ? "Principal Administrator"
          : user.role === "teacher"
          ? "Faculty Member"
          : user.role === "student"
          ? "Enrolled Student"
          : "Guardian / Parent"
      );
    }
  }, [user]);

  // Handle Save Profile
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast.error("Full Name is required");
      return;
    }

    try {
      setSavingProfile(true);
      const res = await api.put("/users/profile", {
        name,
        phoneNumber,
        address,
        avatar: avatarUrl,
        emergencyContact: {
          name: `${name.split(" ")[0]} Contact`,
          phone: emergencyPhone,
          relationship: "Contact",
        },
      });

      if (res.data?.user) {
        setUser((prev: any) => ({ ...prev, ...res.data.user }));
      }
      toast.success("Profile details saved successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Profile Photo Upload via Device File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size must be less than 2MB.");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploadingPhoto(true);
      const res = await api.post("/upload/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.avatarUrl) {
        setAvatarUrl(res.data.avatarUrl);
        setUser((prev: any) => ({ ...prev, avatar: res.data.avatarUrl }));
        toast.success("Profile photo updated successfully!");
        setPhotoModalOpen(false);
      }
    } catch (err: any) {
      // Fallback: Read as base64 data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          const b64 = reader.result.toString();
          setAvatarUrl(b64);
          setUser((prev: any) => ({ ...prev, avatar: b64 }));
          toast.success("Profile photo updated!");
          setPhotoModalOpen(false);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleApplyPhotoUrl = () => {
    if (!customPhotoInput.trim()) {
      toast.error("Please enter a valid image URL");
      return;
    }
    setAvatarUrl(customPhotoInput.trim());
    setUser((prev: any) => ({ ...prev, avatar: customPhotoInput.trim() }));
    toast.success("Profile photo updated!");
    setPhotoModalOpen(false);
    setCustomPhotoInput("");
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

      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const initialLetter = user?.name ? user.name[0].toUpperCase() : "S";

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
      {/* 1. Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-gray-800">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex size-9 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-[#E2E8F0] dark:border-gray-700 shadow-2xs hover:bg-slate-100 dark:hover:bg-gray-700 text-[#0F172A] dark:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
              Settings & Profile
            </h1>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
              Manage your personal credentials, contact info, appearance, and account security in one place.
            </p>
          </div>
        </div>

        <Button
          onClick={() => handleSaveProfile()}
          disabled={savingProfile}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-sm self-start sm:self-auto"
        >
          <Save className="mr-2 size-4" />
          {savingProfile ? "Saving Changes..." : "Save Changes"}
        </Button>
      </div>

      {/* 2. Full-Width Profile Identity Card */}
      <Card className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 rounded-2xl shadow-xs">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar Circle */}
            <div>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name || "User"}
                  className="size-16 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-[#2563EB] text-white font-bold text-2xl shadow-sm">
                  {initialLetter}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-white capitalize">
                {user?.name || "sekhar reddy"}
              </h2>
              <p className="text-xs text-[#64748B] dark:text-gray-400 font-medium">
                {user?.email || "pssekhar199189@gmail.com"}
              </p>
            </div>
          </div>

          {/* Edit Profile Photo Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setPhotoModalOpen(true)}
            className="border-[#CBD5E1] dark:border-gray-700 text-[#0F172A] dark:text-gray-200 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 self-start sm:self-auto shadow-2xs"
          >
            <Camera className="mr-1.5 size-3.5 text-[#2563EB]" />
            Edit Profile Photo
          </Button>
        </CardContent>
      </Card>

      {/* 3. SECTION 1: Personal Information Card */}
      <Card className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 rounded-2xl shadow-xs">
        <CardHeader className="pb-4 border-b border-[#F1F5F9] dark:border-gray-800">
          <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <User className="size-4 text-[#2563EB]" /> Personal Information
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
            Basic user credentials and identity used across your SchoolSync account.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Row 1: Full Name, Display Name, Email Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Full Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-medium text-[#0F172A] dark:text-white"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Display Name
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-medium text-[#0F172A] dark:text-white"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Email Address
                </Label>
                <Input
                  value={user?.email || "pssekhar199189@gmail.com"}
                  disabled
                  className="h-11 rounded-xl bg-[#F8FAFC] dark:bg-gray-800/60 border-[#E2E8F0] dark:border-gray-700 text-xs font-medium text-[#64748B] dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 2: Phone Number, Job Title, Company / Organization */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Phone Number
                </Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 99887 76655"
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Role / Job Title
                </Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Company / Organization
                </Label>
                <Input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-medium"
                />
              </div>
            </div>

            {/* Row 3: Country / Region, Time Zone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Country / Region
                </Label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Time Zone
                </Label>
                <Input
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-medium"
                />
              </div>
            </div>

            {/* Row 4: Residential Address, Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Residential Address
                </Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="City, State, Country"
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-[#64748B] dark:text-gray-400 block mb-1.5">
                  Emergency Contact Phone
                </Label>
                <Input
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98481 23456"
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs font-medium"
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 4. SECTION 2: Appearance & Theme Card */}
      <Card className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 rounded-2xl shadow-xs">
        <CardHeader className="pb-4 border-b border-[#F1F5F9] dark:border-gray-800">
          <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <Palette className="size-4 text-purple-600 dark:text-purple-400" /> Appearance & Theme
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
            Customize your visual workspace display mode and theme preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-5 rounded-2xl border text-left transition-all ${
                theme === "light"
                  ? "border-[#2563EB] bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-[#2563EB]"
                  : "border-[#E2E8F0] dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600"
              }`}
            >
              <Sun className="size-6 text-amber-500 mb-3" />
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">Light Mode</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Crisp, high-contrast daytime interface
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-5 rounded-2xl border text-left transition-all ${
                theme === "dark"
                  ? "border-[#2563EB] bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-[#2563EB]"
                  : "border-[#E2E8F0] dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600"
              }`}
            >
              <Moon className="size-6 text-indigo-500 mb-3" />
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">Dark Mode</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Sleek low-light theme to reduce eye strain
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`p-5 rounded-2xl border text-left transition-all ${
                theme === "system"
                  ? "border-[#2563EB] bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-[#2563EB]"
                  : "border-[#E2E8F0] dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600"
              }`}
            >
              <Laptop className="size-6 text-teal-500 mb-3" />
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">System Synchronized</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Automatically follows your operating system
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 5. SECTION 3: Security & Password Card */}
      <Card className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800 rounded-2xl shadow-xs">
        <CardHeader className="pb-4 border-b border-[#F1F5F9] dark:border-gray-800">
          <CardTitle className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <Shield className="size-4 text-emerald-600 dark:text-emerald-400" /> Security & Password
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B] dark:text-gray-400">
            Update your account password and authentication credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <Label className="text-xs font-semibold text-[#0F172A] dark:text-white block mb-1.5">
                Current Password
              </Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#0F172A] dark:text-white block mb-1.5">
                New Password
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#0F172A] dark:text-white block mb-1.5">
                Confirm New Password
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 rounded-xl bg-white dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={updatingPassword}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-6 py-2.5 rounded-xl mt-2 shadow-xs"
            >
              <Lock className="mr-2 size-4" />
              {updatingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Profile Photo Edit Modal */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-[#F1F5F9] dark:border-gray-800">
            <DialogTitle className="text-base font-bold text-[#0F172A] dark:text-white">
              Edit Profile Photo
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B] dark:text-gray-400">
              Upload a picture from your device or paste a direct image URL.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Upload Button */}
            <div className="text-center p-6 rounded-2xl border-2 border-dashed border-[#CBD5E1] dark:border-gray-700 bg-[#F8FAFC] dark:bg-gray-900/50 space-y-2">
              <Camera className="mx-auto size-8 text-[#2563EB]" />
              <p className="text-xs font-semibold text-[#0F172A] dark:text-white">
                Upload from your computer
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-gray-400">PNG, JPG, or WebP up to 2MB</p>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold mt-2"
              >
                <Upload className="mr-1.5 size-3.5" />
                {uploadingPhoto ? "Uploading..." : "Select File"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Or Paste URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#0F172A] dark:text-white">
                Or enter image URL
              </Label>
              <div className="flex gap-2">
                <Input
                  value={customPhotoInput}
                  onChange={(e) => setCustomPhotoInput(e.target.value)}
                  placeholder="https://images.example.com/my-photo.jpg"
                  className="text-xs h-10 rounded-xl"
                />
                <Button
                  type="button"
                  onClick={handleApplyPhotoUrl}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-[#F1F5F9] dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPhotoModalOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
