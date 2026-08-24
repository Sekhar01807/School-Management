import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import {
  type Class,
  type UserRole,
  type pagination,
  type subject,
  type user,
} from "@/types";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomInput } from "@/components/global/CustomInput";
import { api } from "@/lib/api";
import { CustomSelect } from "@/components/global/CustomSelect";
import { useEffect, useState } from "react";
import { CustomMultiSelect } from "@/components/global/CustomMultiSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type FormType = "login" | "create" | "update";
interface Props {
  type: FormType;
  initialData?: user | null;
  onSuccess?: () => void;
  role?: UserRole;
}

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,}$/;

const createSchema = (type: FormType) => {
  return z
    .object({
      name:
        type === "login"
          ? z.string().optional()
          : z.string().min(2, "Name is required"),
      classId: z.string().optional(),
      subjectIds: z.array(z.string()).optional(),
      email: z.email("Invalid email address"),
      role: z.string().optional(),
      password:
        type === "update"
          ? z
              .string()
              .optional()
              .refine((val) => !val || (val.length >= 8 && STRONG_PASSWORD_REGEX.test(val)), {
                message:
                  "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
              })
          : type === "login"
          ? z.string().min(1, "Password is required")
          : z
              .string()
              .min(8, "Password must be at least 8 characters long")
              .regex(/[A-Z]/, "Must include at least one uppercase letter (A-Z)")
              .regex(/[a-z]/, "Must include at least one lowercase letter (a-z)")
              .regex(/[0-9]/, "Must include at least one number (0-9)")
              .regex(
                /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
                "Must include at least one special character (!@#$%^&*)"
              ),
      confirmPassword:
        type === "create"
          ? z.string().min(8, {
              message: "Password must be at least 8 characters.",
            })
          : z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (type === "create" && data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords don't match",
          path: ["confirmPassword"],
        });
      }
    });
};

type FormValues = z.infer<ReturnType<typeof createSchema>>;

const UniversalUserForm = ({ type, initialData, onSuccess, role }: Props) => {
  const isUpdate = type === "update";
  const isLogin = type === "login";

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [subjects, setSubjects] = useState<subject[]>([]);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(type)),
    defaultValues: {
      name: "",
      email: "",
      role: role,
      password: "",
      classId: undefined,
      subjectIds: [],
    },
  });

  // fetch classes (only when creating or updating)
  useEffect(() => {
    if (type === "login") return;
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const { data } = (await api.get("/classes")) as {
          data: { classes: Class[]; pagination: pagination };
        };
        setClasses(data.classes || []);
      } catch (error) {
        console.log("Could not load classes for dropdown:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [type]);

  // Fetch subjects (only when creating or updating)
  useEffect(() => {
    if (type === "login") return;
    const fetchSubjects = async () => {
      try {
        setLoadingOptions(true);
        const { data } = (await api.get("/subjects")) as {
          data: { subjects: subject[]; pagination: pagination };
        };
        setSubjects(data.subjects || []);
      } catch (error) {
        console.log("Could not load subjects for dropdown:", error);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchSubjects();
  }, [type]);

  // Populate form for Update mode
  useEffect(() => {
    if (initialData && isUpdate) {
      const existingClassId =
        typeof initialData.studentClass === "object"
          ? initialData.studentClass?._id
          : initialData.studentClass;

      form.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        role: initialData.role || "student",
        password: "",
        classId: existingClassId || "",
        subjectIds: initialData.teacherSubjects?.map((s) => s._id) || [],
      });
    }
  }, [isUpdate, initialData, form, classes]);

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        studentClass: data.classId ? data.classId : undefined,
        teacherSubject: data.subjectIds ? data.subjectIds : [],
        teacherSubjects: data.subjectIds ? data.subjectIds : [],
        ...data,
      };
      if (isLogin) {
        await api.post("/users/login", {
          email: data.email,
          password: data.password,
        });
        toast.success("Logged in successfully");
        window.location.href = "/dashboard";
      } else if (type === "create") {
        await api.post("/users/register", payload);
        toast.success("Account created successfully!");
        if (onSuccess) {
          onSuccess();
        } else {
          // Auto-login after public registration
          try {
            await api.post("/users/login", {
              email: data.email,
              password: data.password,
            });
            window.location.href = "/dashboard";
          } catch {
            window.location.href = "/login";
          }
        }
      } else if (type === "update" && initialData?._id) {
        await api.put(`/users/update/${initialData._id}`, payload);
        toast.success("User updated successfully");
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred. Please try again.");
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    try {
      setForgotLoading(true);
      await api.post("/users/forgot-password", { email: forgotEmail });
      setForgotSent(true);
      toast.success("Password reset instructions dispatched!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to process request.");
    } finally {
      setForgotLoading(false);
    }
  };

  const selectedRole = form.watch("role") || role || "student";

  const classOptions = Array.isArray(classes)
    ? classes.map((c) => ({
        label: c.name,
        value: c._id,
      }))
    : [];
  const subjectOptions = Array.isArray(subjects)
    ? subjects.map((s) => ({ label: s.name, value: s._id }))
    : [];
  const roleOptions = role
    ? [{ label: role.charAt(0).toUpperCase() + role.slice(1), value: role }]
    : [
        { label: "Student", value: "student" },
        { label: "Teacher", value: "teacher" },
        { label: "Parent", value: "parent" },
        { label: "Administrator", value: "admin" },
      ];

  const pending = form.formState.isSubmitting;
  const showRoleSelector = !isLogin;
  const showClassSelector = !isLogin && selectedRole === "student";
  const showSubjectSelector = !isLogin && selectedRole === "teacher";

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4 w-full">
            {!isLogin && (
              <CustomInput
                control={form.control}
                name="name"
                label="Full Name"
                placeholder="Jane Doe"
                disabled={pending}
              />
            )}
            {/* role selector */}
            {showRoleSelector && (
              <CustomSelect
                control={form.control}
                name="role"
                label="Role"
                placeholder="Select role"
                options={roleOptions}
                disabled={pending}
              />
            )}
            <div className="col-span-2 space-y-2">
              {/* class */}
              {showClassSelector && (
                <CustomSelect
                  control={form.control}
                  name="classId"
                  label="Class"
                  placeholder="Select Class"
                  options={classOptions}
                  disabled={pending}
                  loading={loading}
                />
              )}
              {/* subjects(multiple select is need here) */}
              {showSubjectSelector && (
                <CustomMultiSelect
                  control={form.control}
                  name="subjectIds"
                  label="Subjects"
                  placeholder="Select subjects..."
                  options={subjectOptions}
                  loading={loadingOptions}
                  disabled={pending}
                />
              )}
              <CustomInput
                control={form.control}
                name="email"
                label="Email Address"
                type="email"
                placeholder="m@example.com"
                disabled={pending}
              />
            </div>
            <div className="col-span-2">
              <CustomInput
                control={form.control}
                name="password"
                label="Password"
                type="password"
                placeholder={isUpdate ? "New Password (Optional)" : "Password"}
                disabled={pending}
              />
            </div>

            {/* Live Password Security Checklist for Registration */}
            {type === "create" && (
              <div className="col-span-2 p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-[#E2E8F0] dark:border-gray-800 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-[#334155] dark:text-gray-300">
                  <span>Password Requirements</span>
                  <span
                    className={
                      (form.watch("password") || "").length >= 8 &&
                      /[A-Z]/.test(form.watch("password") || "") &&
                      /[0-9]/.test(form.watch("password") || "") &&
                      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(form.watch("password") || "")
                        ? "text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-[#64748B]"
                    }
                  >
                    {(form.watch("password") || "").length >= 8 &&
                    /[A-Z]/.test(form.watch("password") || "") &&
                    /[0-9]/.test(form.watch("password") || "") &&
                    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(form.watch("password") || "")
                      ? "Strong & Compliant"
                      : "Security Standards"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div
                    className={`flex items-center gap-1.5 ${
                      (form.watch("password") || "").length >= 8
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-[#94A3B8]"
                    }`}
                  >
                    <span>{(form.watch("password") || "").length >= 8 ? "✓" : "○"}</span>
                    <span>8+ characters</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      /[A-Z]/.test(form.watch("password") || "")
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-[#94A3B8]"
                    }`}
                  >
                    <span>{/[A-Z]/.test(form.watch("password") || "") ? "✓" : "○"}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      /[0-9]/.test(form.watch("password") || "")
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-[#94A3B8]"
                    }`}
                  >
                    <span>{/[0-9]/.test(form.watch("password") || "") ? "✓" : "○"}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(form.watch("password") || "")
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-[#94A3B8]"
                    }`}
                  >
                    <span>
                      {/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(form.watch("password") || "")
                        ? "✓"
                        : "○"}
                    </span>
                    <span>Special character (!@#$)</span>
                  </div>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="col-span-2 -mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(form.getValues("email") || "");
                    setForgotOpen(true);
                  }}
                  className="text-xs font-semibold text-[#1E40AF] dark:text-blue-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {type === "create" && (
              <div className="col-span-2">
                <CustomInput
                  control={form.control}
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  placeholder={"Confirm Password"}
                  disabled={pending}
                />
              </div>
            )}
            <div className="col-span-2 mt-2">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending
                  ? "Processing..."
                  : type === "login"
                  ? "Sign In"
                  : type === "create"
                  ? "Create Account"
                  : "Save Changes"}
              </Button>
            </div>
          </div>
        </FieldGroup>
      </form>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0F172A] dark:text-white">
              Reset Your Password
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B] dark:text-gray-400">
              Enter your registered email address below, and we'll dispatch a secure 15-minute reset link.
            </DialogDescription>
          </DialogHeader>
          {forgotSent ? (
            <div className="py-4 text-center space-y-3">
              <div className="size-10 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-5" />
              </div>
              <p className="text-xs text-[#334155] dark:text-gray-300">
                If an account with that email exists, password reset instructions have been dispatched!
              </p>
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setForgotOpen(false);
                  setForgotSent(false);
                }}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#334155] dark:text-gray-300">
                  Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="student@schoolsync.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={forgotLoading}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotOpen(false)}
                  disabled={forgotLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs"
                >
                  {forgotLoading ? "Sending Link..." : "Send Reset Link"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UniversalUserForm;

