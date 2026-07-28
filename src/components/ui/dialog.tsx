"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "@/components/ui/material-icon"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn("fixed inset-0 z-50 bg-[var(--aui-scrim)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none", className)} {...props} />
}

function DialogContent({ className, children, showClose = true, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return <DialogPrimitive.Portal><DialogOverlay /><DialogPrimitive.Content data-slot="dialog-content" className={cn("fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-calc(var(--aui-component-dialog-viewport-inset)*2))] max-w-[var(--aui-component-overlay-dialog-width)] -translate-x-1/2 -translate-y-1/2 gap-[var(--aui-component-dialog-content-gap)] rounded-[var(--aui-radius-overlay)] bg-[var(--aui-surface)] p-[var(--aui-component-dialog-compact-padding)] text-[var(--aui-text)] shadow-[var(--aui-shadow-elevated)] outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:animate-none md:p-[var(--aui-component-dialog-wide-padding)]", className)} {...props}>{children}{showClose&&<DialogPrimitive.Close aria-label="닫기" className="absolute right-[var(--aui-component-dialog-close-inset)] top-[var(--aui-component-dialog-close-inset)] grid size-[var(--aui-component-dialog-close-size)] place-items-center rounded-[var(--aui-radius-control)] text-[var(--aui-text-muted)] outline-none hover:bg-[var(--aui-fill)] focus-visible:shadow-[var(--aui-shadow-focus)] md:size-[var(--aui-component-dialog-close-compact-size)]"><X className="size-[var(--aui-icon-md)]" /></DialogPrimitive.Close>}</DialogPrimitive.Content></DialogPrimitive.Portal>
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("grid gap-[var(--aui-component-dialog-header-gap)] pr-[var(--aui-component-dialog-header-action-reserve)]", className)} {...props} /> }
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) { return <DialogPrimitive.Title className={cn("m-0 text-lg font-bold", className)} {...props} /> }
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) { return <DialogPrimitive.Description className={cn("m-0 text-sm leading-6 text-[var(--aui-text-muted)]", className)} {...props} /> }
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("flex flex-col-reverse gap-[var(--aui-component-dialog-footer-gap)] pt-[var(--aui-component-dialog-footer-padding-top)] sm:flex-row sm:justify-end", className)} {...props} /> }

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
