"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("flex min-h-[var(--aui-component-tabs-list-height)] gap-[var(--aui-component-tabs-list-gap)] border-b border-[var(--aui-border-subtle)]", className)} {...props} />
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn("relative px-[var(--aui-component-tabs-trigger-padding-inline)] text-[17px] font-semibold leading-6 text-[var(--aui-text-muted)] outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-[var(--aui-component-tabs-indicator-height)] after:rounded-full after:bg-transparent hover:text-[var(--aui-text)] focus-visible:shadow-[var(--aui-shadow-focus)] data-[state=active]:text-[var(--aui-text)] data-[state=active]:after:bg-[var(--aui-primary)]", className)} {...props} />
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("py-[var(--aui-component-tabs-content-padding-block)] outline-none focus-visible:shadow-[var(--aui-shadow-focus)]", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
