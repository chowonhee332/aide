"use client"

import * as React from "react"
import { AlertDialog as AlertPrimitive } from "@base-ui/react/alert-dialog"
import { cn } from "@/lib/utils"

const AlertDialog=AlertPrimitive.Root
const AlertDialogTrigger=AlertPrimitive.Trigger
const AlertDialogCancel=AlertPrimitive.Close
const AlertDialogAction=AlertPrimitive.Close
function AlertDialogContent({className,...props}:React.ComponentProps<typeof AlertPrimitive.Popup>){return <AlertPrimitive.Portal><AlertPrimitive.Backdrop className="fixed inset-0 z-50 bg-[var(--aui-scrim)]"/><AlertPrimitive.Popup data-slot="alert-dialog-content" className={cn("fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-calc(var(--aui-component-dialog-viewport-inset)*2))] max-w-[var(--aui-component-overlay-dialog-width)] -translate-x-1/2 -translate-y-1/2 gap-[var(--aui-component-dialog-content-gap)] rounded-[var(--aui-radius-overlay)] bg-[var(--aui-surface)] p-[var(--aui-component-dialog-compact-padding)] shadow-[var(--aui-shadow-elevated)] outline-none md:p-[var(--aui-component-dialog-wide-padding)]",className)} {...props}/></AlertPrimitive.Portal>}
function AlertDialogTitle({className,...props}:React.ComponentProps<typeof AlertPrimitive.Title>){return <AlertPrimitive.Title className={cn("m-0 text-lg font-bold text-[var(--aui-text)]",className)} {...props}/>}
function AlertDialogDescription({className,...props}:React.ComponentProps<typeof AlertPrimitive.Description>){return <AlertPrimitive.Description className={cn("m-0 text-sm leading-6 text-[var(--aui-text-muted)]",className)} {...props}/>}
function AlertDialogFooter({className,...props}:React.ComponentProps<"div">){return <div className={cn("flex flex-col-reverse gap-[var(--aui-component-dialog-footer-gap)] sm:flex-row sm:justify-end",className)} {...props}/>} 
export {AlertDialog,AlertDialogTrigger,AlertDialogCancel,AlertDialogAction,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter}
