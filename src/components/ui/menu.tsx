"use client"

import * as React from "react"
import { Check, ChevronRight } from "@/components/ui/material-icon"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"

const Menu = MenuPrimitive.Root
const MenuTrigger = MenuPrimitive.Trigger
const MenuGroup = MenuPrimitive.Group
const MenuPortal = MenuPrimitive.Portal

function MenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof MenuPrimitive.Popup> & { sideOffset?: number }) { return <MenuPrimitive.Portal><MenuPrimitive.Positioner sideOffset={sideOffset}><MenuPrimitive.Popup data-slot="menu-content" className={cn("z-50 min-w-[var(--aui-component-menu-min-width)] rounded-[var(--aui-radius-control)] border border-[var(--aui-border-subtle)] bg-[var(--aui-surface)] p-[var(--aui-component-menu-inset)] text-[var(--aui-text)] shadow-[var(--aui-shadow-elevated)] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none", className)} {...props}/></MenuPrimitive.Positioner></MenuPrimitive.Portal> }
function MenuItem({ className, destructive, inset, ...props }: React.ComponentProps<typeof MenuPrimitive.Item> & { destructive?: boolean; inset?: boolean }) { return <MenuPrimitive.Item data-slot="menu-item" className={cn("flex min-h-[var(--aui-component-menu-item-height)] cursor-default items-center gap-[var(--aui-component-menu-item-gap)] rounded-[var(--aui-radius-sm)] px-[var(--aui-component-menu-item-padding-inline)] text-sm outline-none data-[highlighted]:bg-[var(--aui-fill)] data-[disabled]:pointer-events-none data-[disabled]:opacity-40", destructive&&"text-[var(--aui-negative)]", inset&&"pl-[var(--aui-component-menu-inset-item-padding-left)]", className)} {...props}/> }
function MenuLabel({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.GroupLabel>) { return <MenuPrimitive.GroupLabel className={cn("px-[var(--aui-component-menu-item-padding-inline)] py-[var(--aui-space-2)] text-xs font-semibold text-[var(--aui-text-muted)]", className)} {...props}/> }
function MenuSeparator({ className, ...props }: React.ComponentProps<"div">) { return <div role="separator" className={cn("-mx-1 my-1 h-px bg-[var(--aui-border-subtle)]", className)} {...props}/> }
const MenuCheckboxItem = MenuPrimitive.CheckboxItem
function MenuCheckboxIndicator(props: React.ComponentProps<typeof MenuPrimitive.CheckboxItemIndicator>) { return <MenuPrimitive.CheckboxItemIndicator {...props}><Check size="var(--aui-icon-sm)"/></MenuPrimitive.CheckboxItemIndicator> }
const MenuSub = MenuPrimitive.SubmenuRoot
function MenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger>) { return <MenuPrimitive.SubmenuTrigger className={cn("flex min-h-[var(--aui-component-menu-item-height)] items-center gap-[var(--aui-component-menu-item-gap)] rounded-[var(--aui-radius-sm)] px-[var(--aui-component-menu-item-padding-inline)] text-sm outline-none data-[highlighted]:bg-[var(--aui-fill)]", className)} {...props}>{children}<ChevronRight size="var(--aui-icon-sm)" className="ml-auto"/></MenuPrimitive.SubmenuTrigger> }

export { Menu, MenuTrigger, MenuPortal, MenuContent, MenuGroup, MenuItem, MenuLabel, MenuSeparator, MenuCheckboxItem, MenuCheckboxIndicator, MenuSub, MenuSubTrigger }
