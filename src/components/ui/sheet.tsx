"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "@/components/ui/material-icon"

import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

function SheetContent({ className, children, side = "bottom", ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "bottom" | "right" }) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--aui-scrim)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"/><DialogPrimitive.Content data-slot="sheet-content" className={cn("fixed z-50 bg-[var(--aui-surface)] text-[var(--aui-text)] shadow-[var(--aui-shadow-elevated)] outline-none data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none", side === "bottom" ? "inset-x-0 bottom-0 max-h-[var(--aui-component-sheet-bottom-max-height)] rounded-t-[var(--aui-radius-overlay)] border-t border-[var(--aui-border-subtle)] p-[var(--aui-component-sheet-compact-padding)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom md:left-1/2 md:right-auto md:w-full md:max-w-[var(--aui-component-overlay-dialog-max-width)] md:-translate-x-1/2" : "inset-y-0 right-0 w-[min(var(--aui-component-sheet-side-width),var(--aui-component-sheet-side-max-viewport-width))] border-l border-[var(--aui-border-subtle)] p-[var(--aui-component-sheet-wide-padding)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right", className)} {...props}>{side === "bottom"&&<div aria-hidden className="mx-auto mb-[var(--aui-space-4)] h-[var(--aui-component-sheet-handle-height)] w-[var(--aui-component-sheet-handle-width)] rounded-full bg-[var(--aui-fill-strong)]"/>}{children}<DialogPrimitive.Close aria-label="닫기" className="absolute right-[var(--aui-space-4)] top-[var(--aui-space-4)] grid size-[var(--aui-component-sheet-close-size)] place-items-center rounded-[var(--aui-radius-control)] text-[var(--aui-text-muted)] outline-none hover:bg-[var(--aui-fill)] focus-visible:shadow-[var(--aui-shadow-focus)]"><X size="var(--aui-icon-sm)"/></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>
}
const SheetTitle = DialogPrimitive.Title
const SheetDescription = DialogPrimitive.Description

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription }
