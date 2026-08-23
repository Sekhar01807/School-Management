import { Moon, Sun, Laptop } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/components/provider/theme";

export const ThemeToogle = () => {
  const { setTheme, theme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  return (
    <div
      className={cn(
        "gap-1 flex items-center p-1 rounded-lg bg-[#1E293B]/80 border border-[#1E293B]",
        isCollapsed ? "flex-col space-y-1" : "flex justify-end"
      )}
    >
      <SidebarMenuItem title={"Choose Light Theme"}>
        <Button
          size={"icon-sm"}
          variant="ghost"
          className={cn(
            "text-[#94A3B8] hover:text-white hover:bg-[#334155] rounded-md h-7 w-7",
            theme === "light" && "bg-[#1E40AF] text-white shadow-xs"
          )}
          onClick={() => setTheme("light")}
        >
          <Sun className="size-3.5" />
        </Button>
      </SidebarMenuItem>
      <SidebarMenuItem title={"Choose Dark Theme"}>
        <Button
          size={"icon-sm"}
          variant="ghost"
          className={cn(
            "text-[#94A3B8] hover:text-white hover:bg-[#334155] rounded-md h-7 w-7",
            theme === "dark" && "bg-[#1E40AF] text-white shadow-xs"
          )}
          onClick={() => setTheme("dark")}
        >
          <Moon className="size-3.5" />
        </Button>
      </SidebarMenuItem>
      <SidebarMenuItem title={"Choose System Theme"}>
        <Button
          size={"icon-sm"}
          variant="ghost"
          className={cn(
            "text-[#94A3B8] hover:text-white hover:bg-[#334155] rounded-md h-7 w-7",
            theme === "system" && "bg-[#1E40AF] text-white shadow-xs"
          )}
          onClick={() => setTheme("system")}
        >
          <Laptop className="size-3.5" />
        </Button>
      </SidebarMenuItem>
    </div>
  );
};
