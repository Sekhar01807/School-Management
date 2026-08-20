import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-[#1E40AF] text-white hover:bg-[#1E3A8A] shadow-xs active:scale-[0.98]",
        destructive:
          "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-destructive/20 shadow-xs",
        outline:
          "border border-[#E2E8F0] dark:border-gray-700 bg-transparent text-[#0F172A] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#1E40AF]",
        secondary:
          "bg-[#0F766E] text-white hover:bg-[#115E59] shadow-xs",
        ghost:
          "text-[#64748B] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-white",
        link: "text-[#1E40AF] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
