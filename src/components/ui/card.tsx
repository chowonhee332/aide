import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  variant = "plain",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm"; variant?: "plain" | "raised" | "bordered" | "selectable" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(
        "group/card flex flex-col gap-[var(--aui-component-card-gap)] overflow-hidden rounded-[var(--aui-component-card-radius)] bg-card py-[var(--aui-component-card-padding)] text-[length:var(--aui-type-body-size)] text-card-foreground has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-[var(--aui-component-card-compact-gap)] data-[size=sm]:py-[var(--aui-component-card-compact-padding)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-[var(--aui-component-card-radius)] *:[img:last-child]:rounded-b-[var(--aui-component-card-radius)]",
        variant === "raised" && "shadow-[var(--aui-shadow-card)]",
        variant === "bordered" && "border border-[var(--aui-border-subtle)]",
        variant === "selectable" && "border border-[var(--aui-border-subtle)] transition-[border-color,box-shadow] hover:border-[var(--aui-primary)] focus-within:shadow-[var(--aui-shadow-focus)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-[var(--aui-component-card-header-gap)] rounded-t-[var(--aui-component-card-radius)] px-[var(--aui-component-card-padding)] group-data-[size=sm]/card:px-[var(--aui-component-card-compact-padding)] has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-[var(--aui-component-card-padding)] group-data-[size=sm]/card:[.border-b]:pb-[var(--aui-component-card-compact-padding)]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-[var(--aui-component-card-padding)] group-data-[size=sm]/card:px-[var(--aui-component-card-compact-padding)]", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-[var(--aui-component-card-radius)] bg-muted/50 p-[var(--aui-component-card-padding)] group-data-[size=sm]/card:p-[var(--aui-component-card-compact-padding)]",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
