import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm font-semibold",
        danger: "bg-danger text-danger-foreground hover:bg-danger/90 shadow-sm font-semibold",
        info: "bg-info text-info-foreground hover:bg-info/90 shadow-sm font-semibold",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm font-semibold",
        outline: "border border-border bg-background hover:bg-muted text-foreground",
        ghost: "hover:bg-muted text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 gap-1.5 rounded-md px-2.5 text-xs",
        lg: "h-11 gap-2 px-5 text-sm",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-11",
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
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
