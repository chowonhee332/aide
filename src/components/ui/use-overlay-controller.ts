"use client"

import * as React from "react"

function useOverlayController(initialOpen=false){
  const [open,setOpen]=React.useState(initialOpen)
  const triggerRef=React.useRef<HTMLElement|null>(null)
  const show=React.useCallback(()=>setOpen(true),[])
  const hide=React.useCallback(()=>setOpen(false),[])
  const toggle=React.useCallback(()=>setOpen(value=>!value),[])
  return {open,setOpen,show,hide,toggle,triggerRef}
}
export {useOverlayController}
