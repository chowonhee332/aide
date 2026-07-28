"use client"

import * as React from "react"
import { Delete } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

const ALPHABET=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
const NUMBERS=['1','2','3','4','5','6','7','8','9','','0','backspace']
function Keypad({type,label,onKey,className}: {type:"alphabet"|"number";label:string;onKey?:(key:string)=>void;className?:string}){
  const keys=type==="alphabet"?ALPHABET:NUMBERS
  return <div data-slot="keypad" data-type={type} role="group" aria-label={label} className={cn("grid gap-[var(--aui-component-keypad-gap)] rounded-[var(--aui-radius-card)] bg-[var(--aui-fill)] p-[var(--aui-component-keypad-inset)]",type==="alphabet"?"grid-cols-7":"grid-cols-3",className)}>{keys.map((key,index)=>key?<button key={key} type="button" aria-label={key==="backspace"?"한 글자 지우기":key} className="grid min-h-[var(--aui-component-keypad-key-height)] min-w-[var(--aui-component-keypad-key-min-width)] place-items-center rounded-[var(--aui-radius-control)] bg-[var(--aui-surface)] text-sm font-semibold text-[var(--aui-text)] shadow-[var(--aui-shadow-soft)] outline-none hover:bg-[var(--aui-primary-soft)] focus-visible:shadow-[var(--aui-shadow-focus)] active:translate-y-px" onClick={()=>onKey?.(key)}>{key==="backspace"?<Delete size="var(--aui-icon-sm)"/>:key}</button>:<span key={`blank-${index}`} aria-hidden/>)}</div>
}
export {Keypad}
