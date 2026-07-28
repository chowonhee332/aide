"use client"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root
function TabsList({className,...props}:React.ComponentProps<typeof TabsPrimitive.List>){return <TabsPrimitive.List className={cn("flex min-h-[var(--aui-component-control-touch-height)] gap-[var(--aui-component-control-gap)] border-b border-[var(--aui-border-subtle)] md:min-h-[var(--aui-component-control-default-height)]",className)} {...props}/>}
function TabsTrigger({className,...props}:React.ComponentProps<typeof TabsPrimitive.Trigger>){return <TabsPrimitive.Trigger className={cn("relative px-[var(--aui-component-tabs-trigger-padding-inline)] text-sm font-medium text-[var(--aui-text-muted)] outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-[var(--aui-component-tabs-indicator-height)] after:rounded-full after:bg-transparent hover:text-[var(--aui-text)] focus-visible:shadow-[var(--aui-shadow-focus)] data-[state=active]:font-semibold data-[state=active]:text-[var(--aui-primary)] data-[state=active]:after:bg-[var(--aui-primary)]",className)} {...props}/>} 
function TabsContent({className,...props}:React.ComponentProps<typeof TabsPrimitive.Content>){return <TabsPrimitive.Content className={cn("py-[var(--aui-component-tabs-content-padding-block)] outline-none focus-visible:shadow-[var(--aui-shadow-focus)]",className)} {...props}/>} 
export { Tabs, TabsList, TabsTrigger, TabsContent }
