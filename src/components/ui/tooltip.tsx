"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof TooltipPrimitive.Popup> & { sideOffset?: number }) {
  return <TooltipPrimitive.Portal><TooltipPrimitive.Positioner sideOffset={sideOffset}><TooltipPrimitive.Popup data-slot="tooltip-content" className={cn("z-50 max-w-64 rounded-[var(--aui-radius-sm)] bg-[var(--aui-inverse-surface)] px-2.5 py-1.5 text-xs leading-5 text-[var(--aui-on-dark)] shadow-[var(--aui-shadow-elevated)] outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none", className)} {...props}/></TooltipPrimitive.Positioner></TooltipPrimitive.Portal>
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
