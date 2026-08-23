"use client";

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";

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

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-3 p-2 rounded-xl bg-[#1E293B]/60 border border-[#1E293B] shadow-2xs" title="Profile">
        <Avatar className="h-8 w-8 rounded-lg ring-1 ring-[#334155]">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="rounded-lg bg-[#1E40AF] text-white font-semibold text-xs">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold text-white">{user.name}</span>
          <span className="truncate text-xs text-[#94A3B8]">{user.email}</span>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
