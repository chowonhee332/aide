"use client"

import * as React from "react"
import { X } from "@/components/ui/material-icon"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverClose = PopoverPrimitive.Close

function PopoverContent({ className, sideOffset = 8, children, ...props }: React.ComponentProps<typeof PopoverPrimitive.Popup> & { sideOffset?: number }) {
  return <PopoverPrimitive.Portal><PopoverPrimitive.Positioner sideOffset={sideOffset}><PopoverPrimitive.Popup data-slot="popover-content" className={cn("z-50 w-[var(--aui-component-popover-width)] rounded-[var(--aui-radius-card)] border border-[var(--aui-border-subtle)] bg-[var(--aui-surface)] p-[var(--aui-component-popover-padding)] text-[var(--aui-text)] shadow-[var(--aui-shadow-elevated)] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none",className)} {...props}>{children}</PopoverPrimitive.Popup></PopoverPrimitive.Positioner></PopoverPrimitive.Portal>
}
function PopoverTitle({className,...props}:React.ComponentProps<typeof PopoverPrimitive.Title>){return <PopoverPrimitive.Title className={cn("m-0 pr-8 text-sm font-bold",className)} {...props}/>}
function PopoverDescription({className,...props}:React.ComponentProps<typeof PopoverPrimitive.Description>){return <PopoverPrimitive.Description className={cn("m-0 mt-[var(--aui-component-popover-description-gap)] text-xs leading-5 text-[var(--aui-text-muted)]",className)} {...props}/>}
function PopoverCloseButton(){return <PopoverPrimitive.Close aria-label="팝오버 닫기" className="absolute right-[var(--aui-component-popover-close-inset)] top-[var(--aui-component-popover-close-inset)] grid size-[var(--aui-component-popover-close-size)] place-items-center rounded-[var(--aui-radius-control)] text-[var(--aui-text-muted)] outline-none hover:bg-[var(--aui-fill)] focus-visible:shadow-[var(--aui-shadow-focus)]"><X className="size-[var(--aui-icon-md)]"/></PopoverPrimitive.Close>}
export {Popover,PopoverTrigger,PopoverClose,PopoverContent,PopoverTitle,PopoverDescription,PopoverCloseButton}
