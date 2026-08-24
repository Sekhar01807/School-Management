"use client";

import {
  UserCheck,
  Settings,
  Shield,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
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
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl bg-[#1E293B]/60 hover:bg-[#1E293B] border border-[#1E293B] shadow-2xs transition-colors"
            >
              <Avatar className="h-8 w-8 rounded-lg ring-1 ring-[#334155]">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-[#1E40AF] text-white font-semibold text-xs">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-white">{user.name}</span>
                <span className="truncate text-xs text-[#94A3B8]">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-[#94A3B8]" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl border border-[#E2E8F0] dark:border-gray-800 shadow-lg bg-white dark:bg-[#111827]"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-[#1E40AF] text-white font-semibold text-xs">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-[#0F172A] dark:text-white">{user.name}</span>
                  <span className="truncate text-xs text-[#64748B] dark:text-gray-400">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#F1F5F9] dark:bg-gray-800" />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => navigate("/settings/profile")}
                className="cursor-pointer text-xs font-medium text-[#334155] dark:text-gray-300 focus:bg-blue-50 dark:focus:bg-gray-800 focus:text-[#1E40AF]"
              >
                <Settings className="mr-2 size-4 text-[#1E40AF]" />
                Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/settings/profile")}
                className="cursor-pointer text-xs font-medium text-[#334155] dark:text-gray-300 focus:bg-blue-50 dark:focus:bg-gray-800 focus:text-[#1E40AF]"
              >
                <Shield className="mr-2 size-4 text-[#16A34A]" />
                Change Password
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-[#F1F5F9] dark:bg-gray-800" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-xs font-medium text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50 focus:text-red-700"
            >
              <LogOut className="mr-2 size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
