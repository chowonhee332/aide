import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--aui-radius-control)] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--aui-motion-fast)] outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:bg-[var(--aui-fill)] disabled:text-[var(--aui-text-disabled)] aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[var(--aui-primary-strong)]",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-[var(--aui-fill)] text-[var(--aui-text)] hover:bg-[var(--aui-fill-strong)] aria-expanded:bg-[var(--aui-fill-strong)] aria-expanded:text-[var(--aui-text)]",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-[var(--aui-negative)] text-white hover:brightness-95 focus-visible:border-[var(--aui-negative)] focus-visible:ring-[var(--aui-negative)]/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-[var(--aui-component-button-default-height)] gap-[var(--aui-space-2)] px-[var(--aui-component-button-default-padding-x)]",
        xs: "h-[var(--aui-component-button-compact-height)] gap-[var(--aui-space-1)] rounded-[var(--aui-radius-sm)] px-[var(--aui-space-2)] text-xs [&_svg:not([class*='size-'])]:size-[var(--aui-icon-sm)]",
        sm: "h-[var(--aui-component-button-compact-height)] gap-[var(--aui-space-2)] px-[var(--aui-component-button-compact-padding-x)] text-xs [&_svg:not([class*='size-'])]:size-[var(--aui-icon-sm)]",
        lg: "h-[var(--aui-component-button-prominent-height)] gap-[var(--aui-space-2)] px-[var(--aui-component-button-prominent-padding-x)] text-base",
        dense: "h-[var(--aui-component-button-compact-height)] gap-[var(--aui-space-2)] px-[var(--aui-component-button-compact-padding-x)] text-xs",
        touch: "h-[var(--aui-component-button-touch-height)] gap-[var(--aui-space-2)] px-[var(--aui-component-button-default-padding-x)] md:h-[var(--aui-component-button-default-height)]",
        prominent: "h-[var(--aui-component-button-prominent-height)] gap-[var(--aui-space-2)] px-[var(--aui-component-button-prominent-padding-x)] text-base",
        icon: "size-[var(--aui-component-button-default-height)]",
        "icon-touch": "size-[var(--aui-component-button-touch-height)] md:size-[var(--aui-component-button-default-height)]",
        "icon-xs":
          "size-[var(--aui-component-button-compact-height)] rounded-[var(--aui-radius-sm)] in-data-[slot=button-group]:rounded-[var(--aui-radius-sm)] [&_svg:not([class*='size-'])]:size-[var(--aui-icon-sm)]",
        "icon-sm":
          "size-[var(--aui-component-button-compact-height)] rounded-[var(--aui-radius-sm)] in-data-[slot=button-group]:rounded-[var(--aui-radius-sm)]",
        "icon-lg": "size-[var(--aui-component-button-prominent-height)]",
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
