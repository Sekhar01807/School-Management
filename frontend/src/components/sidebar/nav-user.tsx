import { User, LogOut, ChevronsUpDown } from "lucide-react";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { getAvatarUrl } from "@/lib/utils";
import { toast } from "sonner";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    role?: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      localStorage.removeItem("token");
      await api.post("/users/logout").finally(() => {
        setUser(null);
        navigate("/login");
        toast.success("Logged out successfully");
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl bg-[#1E293B]/60 hover:bg-[#1E293B] border border-[#1E293B] shadow-2xs transition-colors py-2 px-3 flex items-center gap-3 w-full cursor-pointer"
            >
              <Avatar className="h-8 w-8 rounded-lg ring-1 ring-[#334155] shrink-0">
                <AvatarImage src={getAvatarUrl(user.avatar)} alt={user?.name || "User"} />
                <AvatarFallback className="rounded-lg bg-[#1E40AF] text-white font-semibold text-xs">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <span className="truncate font-semibold text-white block text-sm leading-none">
                  {user?.name || "User"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-[#94A3B8] shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-52 rounded-xl border border-[#E2E8F0] dark:border-gray-800 shadow-xl bg-white dark:bg-[#111827] p-1.5"
            side="top"
            align="center"
            sideOffset={8}
          >
            <DropdownMenuItem
              onClick={() => navigate("/settings/profile")}
              className="cursor-pointer text-xs font-semibold text-[#0F172A] dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg p-2 flex items-center gap-2.5"
            >
              <User className="size-4 text-[#1E40AF] dark:text-blue-400" />
              <span>Profile & Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-[#F1F5F9] dark:bg-gray-800" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg p-2 flex items-center gap-2.5"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
